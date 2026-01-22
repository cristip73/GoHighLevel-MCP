/**
 * Batch Executor - Process multiple items with a single tool call
 *
 * Executes the same tool for multiple items with configurable concurrency,
 * rate limiting, and result aggregation.
 *
 * Features:
 * - Configurable concurrency (default: 5 parallel)
 * - Rate limiting to respect GHL API limits (100 req/min)
 * - Failed items collected separately, successful items continue
 * - Result aggregation: 'summary' or 'detail' mode
 */

import { RateLimiter, getSharedRateLimiter, calculateBackoff } from './rate-limiter.js';
import { applyProjection } from './field-projector.js';

/**
 * Tool executor function type (same as pipeline-executor)
 */
export type BatchToolExecutor = (
  toolName: string,
  args: Record<string, unknown>
) => Promise<{ success: boolean; result?: unknown; error?: string; validationErrors?: string[] }>;

/**
 * Options for batch execution
 */
export interface BatchOptions {
  /** Maximum concurrent executions (default: 5, max: 10) */
  concurrency?: number;
  /** Behavior on error: 'continue' to process remaining, 'stop' to halt (default: 'continue') */
  on_error?: 'continue' | 'stop';
  /** Result mode: 'summary' for counts only, 'detail' for all results (default: 'summary') */
  result_mode?: 'summary' | 'detail';
  /** Field projection for detail mode (reduces result size) */
  select_fields?: string[];
  /** Maximum retries per item on failure (default: 0, max: 3) */
  max_retries?: number;
  /** Custom rate limiter (for testing, uses shared limiter by default) */
  rateLimiter?: RateLimiter;
}

/**
 * Batch execution request
 */
export interface BatchRequest {
  /** Name of the tool to execute for each item */
  tool_name: string;
  /** Array of argument objects, one per item */
  items: Record<string, unknown>[];
  /** Optional execution options */
  options?: BatchOptions;
}

/**
 * Individual item execution result
 */
export interface ItemResult {
  /** Index of the item in the original array */
  index: number;
  /** Whether execution succeeded */
  success: boolean;
  /** Result data (only if success) */
  result?: unknown;
  /** Error message (only if failed) */
  error?: string;
  /** Validation errors (only if failed) */
  validation_errors?: string[];
  /** Number of retries attempted */
  retries?: number;
}

/**
 * Summary result (counts only)
 */
export interface BatchSummaryResult {
  /** Total items processed */
  total: number;
  /** Successfully processed count */
  succeeded: number;
  /** Failed count */
  failed: number;
  /** Execution time in milliseconds */
  duration_ms: number;
  /** Error details for failed items */
  errors: Array<{
    index: number;
    error: string;
  }>;
}

/**
 * Detail result (all results included)
 */
export interface BatchDetailResult {
  /** Total items processed */
  total: number;
  /** Successfully processed count */
  succeeded: number;
  /** Failed count */
  failed: number;
  /** Execution time in milliseconds */
  duration_ms: number;
  /** All successful results */
  results: Array<{
    index: number;
    result: unknown;
  }>;
  /** All failed items with errors */
  errors: Array<{
    index: number;
    error: string;
    validation_errors?: string[];
  }>;
}

/**
 * Full batch execution result
 */
export interface BatchResult {
  success: boolean;
  /** Summary or detail based on result_mode */
  data: BatchSummaryResult | BatchDetailResult;
  /** Set to true if batch was stopped due to stop_on_error */
  stopped_early?: boolean;
  /** Rate limiter state at end of execution */
  rate_limit_state?: {
    tokens_remaining: number;
    wait_time_ms: number;
  };
}

/**
 * Default batch options
 */
const DEFAULT_OPTIONS: Required<Omit<BatchOptions, 'select_fields' | 'rateLimiter'>> = {
  concurrency: 5,
  on_error: 'continue',
  result_mode: 'summary',
  max_retries: 0
};

/**
 * Maximum allowed values
 */
const MAX_CONCURRENCY = 10;
const MAX_RETRIES = 3;
const MAX_ITEMS = 100; // Prevent abuse

/**
 * Validate batch request
 */
export function validateBatchRequest(request: BatchRequest): string[] {
  const errors: string[] = [];

  if (!request.tool_name || typeof request.tool_name !== 'string') {
    errors.push('tool_name is required and must be a string');
  }

  if (!request.items || !Array.isArray(request.items)) {
    errors.push('items must be an array');
  } else {
    if (request.items.length === 0) {
      errors.push('items array cannot be empty');
    }
    if (request.items.length > MAX_ITEMS) {
      errors.push(`items array cannot exceed ${MAX_ITEMS} items`);
    }
    // Validate each item is an object
    for (let i = 0; i < request.items.length; i++) {
      if (typeof request.items[i] !== 'object' || request.items[i] === null) {
        errors.push(`items[${i}] must be an object with tool arguments`);
      }
    }
  }

  if (request.options) {
    const opts = request.options;

    if (opts.concurrency !== undefined) {
      if (typeof opts.concurrency !== 'number' || opts.concurrency < 1) {
        errors.push('concurrency must be a positive number');
      } else if (opts.concurrency > MAX_CONCURRENCY) {
        errors.push(`concurrency cannot exceed ${MAX_CONCURRENCY}`);
      }
    }

    if (opts.on_error !== undefined && !['continue', 'stop'].includes(opts.on_error)) {
      errors.push('on_error must be "continue" or "stop"');
    }

    if (opts.result_mode !== undefined && !['summary', 'detail'].includes(opts.result_mode)) {
      errors.push('result_mode must be "summary" or "detail"');
    }

    if (opts.max_retries !== undefined) {
      if (typeof opts.max_retries !== 'number' || opts.max_retries < 0) {
        errors.push('max_retries must be a non-negative number');
      } else if (opts.max_retries > MAX_RETRIES) {
        errors.push(`max_retries cannot exceed ${MAX_RETRIES}`);
      }
    }

    if (opts.select_fields !== undefined && !Array.isArray(opts.select_fields)) {
      errors.push('select_fields must be an array of field paths');
    }
  }

  return errors;
}

/**
 * Execute a single item with retries
 */
async function executeItem(
  executor: BatchToolExecutor,
  toolName: string,
  args: Record<string, unknown>,
  index: number,
  maxRetries: number,
  rateLimiter: RateLimiter
): Promise<ItemResult> {
  let lastError: string = '';
  let lastValidationErrors: string[] | undefined;
  let retries = 0;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    // Acquire rate limit token
    const acquired = await rateLimiter.acquire(30000); // 30s timeout
    if (!acquired) {
      return {
        index,
        success: false,
        error: 'Rate limit timeout - could not acquire token within 30s',
        retries: attempt
      };
    }

    try {
      const result = await executor(toolName, args);

      if (result.success) {
        return {
          index,
          success: true,
          result: result.result,
          retries: attempt > 0 ? attempt : undefined
        };
      }

      // Execution failed
      lastError = result.error || 'Unknown error';
      lastValidationErrors = result.validationErrors;

      // Don't retry validation errors (they won't succeed)
      if (result.validationErrors && result.validationErrors.length > 0) {
        break;
      }

      retries = attempt;

      // Apply backoff before retry (if not last attempt)
      if (attempt < maxRetries) {
        const backoffMs = calculateBackoff(attempt);
        await new Promise(resolve => setTimeout(resolve, backoffMs));
      }
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      retries = attempt;

      if (attempt < maxRetries) {
        const backoffMs = calculateBackoff(attempt);
        await new Promise(resolve => setTimeout(resolve, backoffMs));
      }
    }
  }

  return {
    index,
    success: false,
    error: lastError,
    validation_errors: lastValidationErrors,
    retries: retries > 0 ? retries : undefined
  };
}

/**
 * Execute batch with concurrency limiting
 *
 * Uses a semaphore-like pattern to limit concurrent executions
 */
async function executeWithConcurrency<T>(
  items: T[],
  concurrency: number,
  executor: (item: T, index: number) => Promise<ItemResult>,
  onError: 'continue' | 'stop'
): Promise<{ results: ItemResult[]; stoppedEarly: boolean }> {
  const results: ItemResult[] = new Array(items.length);
  let stoppedEarly = false;
  let shouldStop = false;

  // Process items in batches of `concurrency` size
  for (let i = 0; i < items.length && !shouldStop; i += concurrency) {
    const batch = items.slice(i, Math.min(i + concurrency, items.length));
    const batchStartIndex = i;

    const batchPromises = batch.map((item, batchIndex) => {
      const globalIndex = batchStartIndex + batchIndex;
      return executor(item, globalIndex);
    });

    const batchResults = await Promise.all(batchPromises);

    // Store results
    for (let j = 0; j < batchResults.length; j++) {
      results[batchStartIndex + j] = batchResults[j];

      // Check for stop condition
      if (onError === 'stop' && !batchResults[j].success) {
        shouldStop = true;
        stoppedEarly = true;
      }
    }
  }

  // Filter out undefined (items that weren't processed due to early stop)
  const processedResults = results.filter(r => r !== undefined);

  return { results: processedResults, stoppedEarly };
}

/**
 * Execute a batch of tool calls
 *
 * @param request - Batch request with tool name, items, and options
 * @param executor - Function to execute individual tool calls
 * @returns Batch result with aggregated data
 */
export async function executeBatch(
  request: BatchRequest,
  executor: BatchToolExecutor
): Promise<BatchResult> {
  const startTime = Date.now();

  // Validate request
  const validationErrors = validateBatchRequest(request);
  if (validationErrors.length > 0) {
    return {
      success: false,
      data: {
        total: 0,
        succeeded: 0,
        failed: 0,
        duration_ms: 0,
        errors: validationErrors.map((err, idx) => ({ index: idx, error: err }))
      } as BatchSummaryResult
    };
  }

  // Merge options with defaults
  const options: Required<Omit<BatchOptions, 'select_fields' | 'rateLimiter'>> & Pick<BatchOptions, 'select_fields' | 'rateLimiter'> = {
    ...DEFAULT_OPTIONS,
    ...request.options
  };

  // Get rate limiter (shared or provided for testing)
  const rateLimiter = options.rateLimiter || getSharedRateLimiter();

  // Execute items with concurrency
  const { results, stoppedEarly } = await executeWithConcurrency(
    request.items,
    options.concurrency,
    (item, index) => executeItem(
      executor,
      request.tool_name,
      item,
      index,
      options.max_retries,
      rateLimiter
    ),
    options.on_error
  );

  const duration = Date.now() - startTime;

  // Separate successes and failures
  const successes = results.filter(r => r.success);
  const failures = results.filter(r => !r.success);

  // Get rate limiter state
  const rateLimitState = rateLimiter.getState();

  // Build result based on mode
  if (options.result_mode === 'detail') {
    // Apply projection if specified
    let processedResults = successes.map(r => ({
      index: r.index,
      result: r.result
    }));

    if (options.select_fields && options.select_fields.length > 0) {
      processedResults = processedResults.map(r => ({
        index: r.index,
        result: applyProjection(r.result, options.select_fields!)
      }));
    }

    const detailResult: BatchDetailResult = {
      total: request.items.length,
      succeeded: successes.length,
      failed: failures.length,
      duration_ms: duration,
      results: processedResults,
      errors: failures.map(f => ({
        index: f.index,
        error: f.error || 'Unknown error',
        validation_errors: f.validation_errors
      }))
    };

    return {
      success: failures.length === 0,
      data: detailResult,
      stopped_early: stoppedEarly || undefined,
      rate_limit_state: {
        tokens_remaining: rateLimitState.tokens,
        wait_time_ms: rateLimitState.waitTimeMs
      }
    };
  }

  // Summary mode (default)
  const summaryResult: BatchSummaryResult = {
    total: request.items.length,
    succeeded: successes.length,
    failed: failures.length,
    duration_ms: duration,
    errors: failures.map(f => ({
      index: f.index,
      error: f.error || 'Unknown error'
    }))
  };

  return {
    success: failures.length === 0,
    data: summaryResult,
    stopped_early: stoppedEarly || undefined,
    rate_limit_state: {
      tokens_remaining: rateLimitState.tokens,
      wait_time_ms: rateLimitState.waitTimeMs
    }
  };
}
