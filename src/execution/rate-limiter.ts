/**
 * Rate Limiter - Token Bucket implementation for GHL API
 *
 * Implements rate limiting to respect GHL API limits (100 requests/minute).
 * Uses token bucket algorithm with automatic refill.
 *
 * Features:
 * - Token bucket with configurable capacity and refill rate
 * - Automatic throttling when approaching limits
 * - Exponential backoff for retry scenarios
 */

/**
 * Rate limiter configuration
 */
export interface RateLimiterConfig {
  /** Maximum tokens (requests) in the bucket */
  maxTokens: number;
  /** Tokens added per refill interval */
  refillRate: number;
  /** Refill interval in milliseconds */
  refillIntervalMs: number;
}

/**
 * Default configuration for GHL API (100 req/min)
 */
export const GHL_RATE_LIMIT_CONFIG: RateLimiterConfig = {
  maxTokens: 100,
  refillRate: 100,
  refillIntervalMs: 60000 // 1 minute
};

/**
 * Token Bucket Rate Limiter
 *
 * Tracks available tokens and provides methods to acquire tokens
 * before making API requests. Automatically refills tokens over time.
 */
export class RateLimiter {
  private tokens: number;
  private lastRefillTime: number;
  private readonly config: RateLimiterConfig;

  constructor(config: RateLimiterConfig = GHL_RATE_LIMIT_CONFIG) {
    this.config = config;
    this.tokens = config.maxTokens;
    this.lastRefillTime = Date.now();
  }

  /**
   * Refill tokens based on elapsed time
   */
  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefillTime;

    if (elapsed >= this.config.refillIntervalMs) {
      // Full refill after interval passes
      const intervals = Math.floor(elapsed / this.config.refillIntervalMs);
      const tokensToAdd = intervals * this.config.refillRate;
      this.tokens = Math.min(this.config.maxTokens, this.tokens + tokensToAdd);
      this.lastRefillTime = now - (elapsed % this.config.refillIntervalMs);
    }
  }

  /**
   * Get current available tokens
   */
  getAvailableTokens(): number {
    this.refill();
    return this.tokens;
  }

  /**
   * Check if we can acquire a token without blocking
   */
  canAcquire(): boolean {
    this.refill();
    return this.tokens > 0;
  }

  /**
   * Try to acquire a token immediately
   * @returns true if token was acquired, false if rate limited
   */
  tryAcquire(): boolean {
    this.refill();
    if (this.tokens > 0) {
      this.tokens--;
      return true;
    }
    return false;
  }

  /**
   * Calculate wait time until a token becomes available
   * @returns milliseconds to wait, 0 if token available now
   */
  getWaitTime(): number {
    this.refill();
    if (this.tokens > 0) {
      return 0;
    }

    // Calculate time until next refill
    const now = Date.now();
    const elapsed = now - this.lastRefillTime;
    const timeUntilRefill = this.config.refillIntervalMs - elapsed;
    return Math.max(0, timeUntilRefill);
  }

  /**
   * Acquire a token, waiting if necessary
   * @param timeoutMs Maximum time to wait (default: 60s)
   * @returns true if token acquired, false if timeout
   */
  async acquire(timeoutMs: number = 60000): Promise<boolean> {
    const startTime = Date.now();

    while (true) {
      if (this.tryAcquire()) {
        return true;
      }

      const waitTime = this.getWaitTime();
      const elapsed = Date.now() - startTime;

      if (elapsed + waitTime > timeoutMs) {
        return false; // Would exceed timeout
      }

      // Wait for tokens to become available
      await this.delay(Math.min(waitTime, timeoutMs - elapsed));
    }
  }

  /**
   * Acquire multiple tokens at once
   * @param count Number of tokens to acquire
   * @param timeoutMs Maximum time to wait
   * @returns true if all tokens acquired, false if timeout
   */
  async acquireMultiple(count: number, timeoutMs: number = 60000): Promise<boolean> {
    if (count <= 0) return true;
    if (count > this.config.maxTokens) return false; // Can never acquire more than max

    const startTime = Date.now();

    while (true) {
      this.refill();

      if (this.tokens >= count) {
        this.tokens -= count;
        return true;
      }

      const elapsed = Date.now() - startTime;
      if (elapsed >= timeoutMs) {
        return false;
      }

      // Wait a bit before checking again
      const waitTime = Math.min(1000, timeoutMs - elapsed);
      await this.delay(waitTime);
    }
  }

  /**
   * Reset rate limiter to full capacity
   * Useful for testing or after a known rate limit reset
   */
  reset(): void {
    this.tokens = this.config.maxTokens;
    this.lastRefillTime = Date.now();
  }

  /**
   * Get current state for debugging/monitoring
   */
  getState(): { tokens: number; maxTokens: number; waitTimeMs: number } {
    this.refill();
    return {
      tokens: this.tokens,
      maxTokens: this.config.maxTokens,
      waitTimeMs: this.getWaitTime()
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Calculate exponential backoff delay
 * @param attempt Current attempt number (0-based)
 * @param baseDelayMs Base delay in milliseconds (default: 1000ms)
 * @param maxDelayMs Maximum delay cap (default: 30000ms)
 * @returns Delay in milliseconds with jitter
 */
export function calculateBackoff(
  attempt: number,
  baseDelayMs: number = 1000,
  maxDelayMs: number = 30000
): number {
  // Exponential: baseDelay * 2^attempt
  const exponentialDelay = baseDelayMs * Math.pow(2, attempt);
  // Cap at max delay
  const cappedDelay = Math.min(exponentialDelay, maxDelayMs);
  // Add jitter (0-25% of delay) to prevent thundering herd
  const jitter = Math.random() * 0.25 * cappedDelay;
  return Math.floor(cappedDelay + jitter);
}

/**
 * Shared rate limiter instance for GHL API
 * Use this for all batch operations to respect API limits
 */
let sharedRateLimiter: RateLimiter | null = null;

/**
 * Get or create the shared rate limiter instance
 */
export function getSharedRateLimiter(): RateLimiter {
  if (!sharedRateLimiter) {
    sharedRateLimiter = new RateLimiter(GHL_RATE_LIMIT_CONFIG);
  }
  return sharedRateLimiter;
}

/**
 * Reset the shared rate limiter (useful for testing)
 */
export function resetSharedRateLimiter(): void {
  if (sharedRateLimiter) {
    sharedRateLimiter.reset();
  }
}
