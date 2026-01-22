/**
 * Unit Tests for Rate Limiter
 * Tests token bucket implementation and backoff calculation
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  RateLimiter,
  GHL_RATE_LIMIT_CONFIG,
  calculateBackoff,
  getSharedRateLimiter,
  resetSharedRateLimiter
} from '../../src/execution/rate-limiter.js';

describe('RateLimiter', () => {
  describe('constructor and defaults', () => {
    it('should initialize with default GHL config', () => {
      const limiter = new RateLimiter();
      const state = limiter.getState();

      expect(state.tokens).toBe(100);
      expect(state.maxTokens).toBe(100);
    });

    it('should accept custom config', () => {
      const limiter = new RateLimiter({
        maxTokens: 50,
        refillRate: 10,
        refillIntervalMs: 1000
      });
      const state = limiter.getState();

      expect(state.tokens).toBe(50);
      expect(state.maxTokens).toBe(50);
    });
  });

  describe('GHL_RATE_LIMIT_CONFIG', () => {
    it('should have correct values for GHL API (100 req/min)', () => {
      expect(GHL_RATE_LIMIT_CONFIG.maxTokens).toBe(100);
      expect(GHL_RATE_LIMIT_CONFIG.refillRate).toBe(100);
      expect(GHL_RATE_LIMIT_CONFIG.refillIntervalMs).toBe(60000);
    });
  });

  describe('getAvailableTokens', () => {
    it('should return initial token count', () => {
      const limiter = new RateLimiter({ maxTokens: 10, refillRate: 10, refillIntervalMs: 1000 });
      expect(limiter.getAvailableTokens()).toBe(10);
    });

    it('should return updated count after consumption', () => {
      const limiter = new RateLimiter({ maxTokens: 10, refillRate: 10, refillIntervalMs: 1000 });
      limiter.tryAcquire();
      limiter.tryAcquire();
      expect(limiter.getAvailableTokens()).toBe(8);
    });
  });

  describe('canAcquire', () => {
    it('should return true when tokens available', () => {
      const limiter = new RateLimiter({ maxTokens: 10, refillRate: 10, refillIntervalMs: 1000 });
      expect(limiter.canAcquire()).toBe(true);
    });

    it('should return false when no tokens available', () => {
      const limiter = new RateLimiter({ maxTokens: 2, refillRate: 2, refillIntervalMs: 60000 });
      limiter.tryAcquire();
      limiter.tryAcquire();
      expect(limiter.canAcquire()).toBe(false);
    });
  });

  describe('tryAcquire', () => {
    it('should consume a token and return true', () => {
      const limiter = new RateLimiter({ maxTokens: 10, refillRate: 10, refillIntervalMs: 1000 });
      const result = limiter.tryAcquire();

      expect(result).toBe(true);
      expect(limiter.getAvailableTokens()).toBe(9);
    });

    it('should return false when no tokens available', () => {
      const limiter = new RateLimiter({ maxTokens: 1, refillRate: 1, refillIntervalMs: 60000 });
      limiter.tryAcquire();
      const result = limiter.tryAcquire();

      expect(result).toBe(false);
    });

    it('should allow consuming all tokens', () => {
      const limiter = new RateLimiter({ maxTokens: 3, refillRate: 3, refillIntervalMs: 60000 });

      expect(limiter.tryAcquire()).toBe(true);
      expect(limiter.tryAcquire()).toBe(true);
      expect(limiter.tryAcquire()).toBe(true);
      expect(limiter.tryAcquire()).toBe(false);
    });
  });

  describe('getWaitTime', () => {
    it('should return 0 when tokens available', () => {
      const limiter = new RateLimiter({ maxTokens: 10, refillRate: 10, refillIntervalMs: 1000 });
      expect(limiter.getWaitTime()).toBe(0);
    });

    it('should return positive wait time when no tokens', () => {
      const limiter = new RateLimiter({ maxTokens: 1, refillRate: 1, refillIntervalMs: 1000 });
      limiter.tryAcquire();

      const waitTime = limiter.getWaitTime();
      expect(waitTime).toBeGreaterThan(0);
      expect(waitTime).toBeLessThanOrEqual(1000);
    });
  });

  describe('acquire (async)', () => {
    it('should acquire immediately when tokens available', async () => {
      const limiter = new RateLimiter({ maxTokens: 10, refillRate: 10, refillIntervalMs: 1000 });

      const startTime = Date.now();
      const result = await limiter.acquire();
      const elapsed = Date.now() - startTime;

      expect(result).toBe(true);
      expect(elapsed).toBeLessThan(50); // Should be nearly instant
    });

    it('should wait and acquire when tokens refill', async () => {
      const limiter = new RateLimiter({ maxTokens: 1, refillRate: 1, refillIntervalMs: 100 });
      limiter.tryAcquire(); // Consume the only token

      const startTime = Date.now();
      const result = await limiter.acquire(200);
      const elapsed = Date.now() - startTime;

      expect(result).toBe(true);
      expect(elapsed).toBeGreaterThanOrEqual(90); // Should wait for refill
    }, 1000);

    it('should return false on timeout', async () => {
      const limiter = new RateLimiter({ maxTokens: 1, refillRate: 1, refillIntervalMs: 5000 });
      limiter.tryAcquire();

      const result = await limiter.acquire(50);
      expect(result).toBe(false);
    });
  });

  describe('acquireMultiple', () => {
    it('should acquire multiple tokens at once', async () => {
      const limiter = new RateLimiter({ maxTokens: 10, refillRate: 10, refillIntervalMs: 1000 });

      const result = await limiter.acquireMultiple(5);
      expect(result).toBe(true);
      expect(limiter.getAvailableTokens()).toBe(5);
    });

    it('should return false if requesting more than max', async () => {
      const limiter = new RateLimiter({ maxTokens: 5, refillRate: 5, refillIntervalMs: 1000 });

      const result = await limiter.acquireMultiple(10);
      expect(result).toBe(false);
    });

    it('should return true for zero count', async () => {
      const limiter = new RateLimiter({ maxTokens: 10, refillRate: 10, refillIntervalMs: 1000 });

      const result = await limiter.acquireMultiple(0);
      expect(result).toBe(true);
    });
  });

  describe('reset', () => {
    it('should restore tokens to max', () => {
      const limiter = new RateLimiter({ maxTokens: 10, refillRate: 10, refillIntervalMs: 1000 });

      // Consume some tokens
      limiter.tryAcquire();
      limiter.tryAcquire();
      limiter.tryAcquire();
      expect(limiter.getAvailableTokens()).toBe(7);

      // Reset
      limiter.reset();
      expect(limiter.getAvailableTokens()).toBe(10);
    });
  });

  describe('getState', () => {
    it('should return current state', () => {
      const limiter = new RateLimiter({ maxTokens: 10, refillRate: 10, refillIntervalMs: 1000 });
      limiter.tryAcquire();
      limiter.tryAcquire();

      const state = limiter.getState();
      expect(state.tokens).toBe(8);
      expect(state.maxTokens).toBe(10);
      expect(state.waitTimeMs).toBe(0);
    });
  });

  describe('refill behavior', () => {
    it('should refill tokens after interval passes', async () => {
      const limiter = new RateLimiter({ maxTokens: 5, refillRate: 5, refillIntervalMs: 100 });

      // Consume all tokens
      for (let i = 0; i < 5; i++) {
        limiter.tryAcquire();
      }
      expect(limiter.getAvailableTokens()).toBe(0);

      // Wait for refill
      await new Promise(resolve => setTimeout(resolve, 150));

      // Should have refilled
      expect(limiter.getAvailableTokens()).toBe(5);
    }, 1000);

    it('should not exceed maxTokens on refill', async () => {
      const limiter = new RateLimiter({ maxTokens: 5, refillRate: 5, refillIntervalMs: 50 });

      // Wait for multiple refill intervals
      await new Promise(resolve => setTimeout(resolve, 200));

      // Should still be capped at max
      expect(limiter.getAvailableTokens()).toBe(5);
    });
  });
});

describe('calculateBackoff', () => {
  it('should return base delay for first attempt', () => {
    const delay = calculateBackoff(0, 1000);
    // First attempt: 1000 * 2^0 = 1000, plus 0-25% jitter
    expect(delay).toBeGreaterThanOrEqual(1000);
    expect(delay).toBeLessThanOrEqual(1250);
  });

  it('should increase exponentially', () => {
    const delay0 = calculateBackoff(0, 1000, 100000);
    const delay1 = calculateBackoff(1, 1000, 100000);
    const delay2 = calculateBackoff(2, 1000, 100000);

    // Each should be roughly double (accounting for jitter)
    expect(delay1).toBeGreaterThan(delay0);
    expect(delay2).toBeGreaterThan(delay1);
  });

  it('should respect max delay cap', () => {
    const delay = calculateBackoff(10, 1000, 5000);
    // 2^10 = 1024, so base would be 1024000ms, but capped at 5000
    expect(delay).toBeLessThanOrEqual(6250); // 5000 + 25% jitter
  });

  it('should use default values', () => {
    const delay = calculateBackoff(0);
    // Default: baseDelay=1000, maxDelay=30000
    expect(delay).toBeGreaterThanOrEqual(1000);
    expect(delay).toBeLessThanOrEqual(1250);
  });

  it('should add jitter to prevent thundering herd', () => {
    // Run multiple times and check for variance
    const delays = Array.from({ length: 10 }, () => calculateBackoff(2, 1000, 100000));
    const uniqueDelays = new Set(delays);

    // With jitter, we should get different values (statistically very likely)
    expect(uniqueDelays.size).toBeGreaterThan(1);
  });
});

describe('Shared Rate Limiter', () => {
  beforeEach(() => {
    resetSharedRateLimiter();
  });

  it('should return same instance', () => {
    const limiter1 = getSharedRateLimiter();
    const limiter2 = getSharedRateLimiter();

    expect(limiter1).toBe(limiter2);
  });

  it('should reset shared limiter', () => {
    const limiter = getSharedRateLimiter();
    limiter.tryAcquire();
    limiter.tryAcquire();

    expect(limiter.getAvailableTokens()).toBe(98);

    resetSharedRateLimiter();
    expect(limiter.getAvailableTokens()).toBe(100);
  });

  it('should use GHL config', () => {
    const limiter = getSharedRateLimiter();
    const state = limiter.getState();

    expect(state.maxTokens).toBe(100);
  });
});
