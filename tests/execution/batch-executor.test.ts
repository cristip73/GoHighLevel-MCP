/**
 * Unit Tests for Batch Executor
 * Tests bulk operations with rate limiting and concurrency
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import {
  executeBatch,
  validateBatchRequest,
  BatchRequest,
  BatchToolExecutor,
  BatchSummaryResult,
  BatchDetailResult
} from '../../src/execution/batch-executor.js';
import { RateLimiter } from '../../src/execution/rate-limiter.js';

describe('Batch Executor', () => {
  // Mock executor that simulates tool execution
  const createMockExecutor = (
    results: Record<string, unknown> | ((args: Record<string, unknown>) => unknown),
    delay = 0
  ): BatchToolExecutor => {
    return async (toolName: string, args: Record<string, unknown>) => {
      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      if (toolName.startsWith('fail_')) {
        return {
          success: false,
          error: `Tool ${toolName} failed`,
          validationErrors: ['Missing required param']
        };
      }

      if (typeof results === 'function') {
        return { success: true, result: results(args) };
      }

      const result = results[toolName];
      if (result === undefined) {
        return {
          success: false,
          error: `Unknown tool: ${toolName}`
        };
      }

      return { success: true, result };
    };
  };

  // Create a fast rate limiter for testing
  const createTestRateLimiter = () => new RateLimiter({
    maxTokens: 100,
    refillRate: 100,
    refillIntervalMs: 1000 // Fast refill for tests
  });

  describe('validateBatchRequest', () => {
    it('should pass valid request', () => {
      const request: BatchRequest = {
        tool_name: 'update_contact',
        items: [{ id: '1' }, { id: '2' }]
      };
      expect(validateBatchRequest(request)).toEqual([]);
    });

    it('should reject missing tool_name', () => {
      const errors = validateBatchRequest({
        items: [{ id: '1' }]
      } as any);
      expect(errors.some(e => e.includes('tool_name'))).toBe(true);
    });

    it('should reject missing items', () => {
      const errors = validateBatchRequest({
        tool_name: 'test'
      } as any);
      expect(errors.some(e => e.includes('items'))).toBe(true);
    });

    it('should reject empty items array', () => {
      const errors = validateBatchRequest({
        tool_name: 'test',
        items: []
      });
      expect(errors.some(e => e.includes('empty'))).toBe(true);
    });

    it('should reject items exceeding max (100)', () => {
      const items = Array.from({ length: 101 }, (_, i) => ({ id: String(i) }));
      const errors = validateBatchRequest({
        tool_name: 'test',
        items
      });
      expect(errors.some(e => e.includes('100'))).toBe(true);
    });

    it('should reject non-object items', () => {
      const errors = validateBatchRequest({
        tool_name: 'test',
        items: ['string', 123] as any
      });
      expect(errors.some(e => e.includes('object'))).toBe(true);
    });

    it('should reject invalid concurrency', () => {
      const errors = validateBatchRequest({
        tool_name: 'test',
        items: [{ id: '1' }],
        options: { concurrency: 15 }
      });
      expect(errors.some(e => e.includes('concurrency'))).toBe(true);
    });

    it('should reject invalid on_error', () => {
      const errors = validateBatchRequest({
        tool_name: 'test',
        items: [{ id: '1' }],
        options: { on_error: 'invalid' as any }
      });
      expect(errors.some(e => e.includes('on_error'))).toBe(true);
    });

    it('should reject invalid result_mode', () => {
      const errors = validateBatchRequest({
        tool_name: 'test',
        items: [{ id: '1' }],
        options: { result_mode: 'invalid' as any }
      });
      expect(errors.some(e => e.includes('result_mode'))).toBe(true);
    });

    it('should reject invalid max_retries', () => {
      const errors = validateBatchRequest({
        tool_name: 'test',
        items: [{ id: '1' }],
        options: { max_retries: 5 }
      });
      expect(errors.some(e => e.includes('max_retries'))).toBe(true);
    });
  });

  describe('executeBatch - Basic Execution', () => {
    it('should execute single item batch', async () => {
      const executor = createMockExecutor((args) => ({ updated: true, id: args.id }));
      const rateLimiter = createTestRateLimiter();

      const result = await executeBatch({
        tool_name: 'update_contact',
        items: [{ id: '1', name: 'John' }],
        options: { rateLimiter }
      }, executor);

      expect(result.success).toBe(true);
      expect(result.data.total).toBe(1);
      expect(result.data.succeeded).toBe(1);
      expect(result.data.failed).toBe(0);
    });

    it('should execute multiple items', async () => {
      const executor = createMockExecutor((args) => ({ updated: true, id: args.id }));
      const rateLimiter = createTestRateLimiter();

      const result = await executeBatch({
        tool_name: 'update_contact',
        items: [
          { id: '1', name: 'John' },
          { id: '2', name: 'Jane' },
          { id: '3', name: 'Bob' }
        ],
        options: { rateLimiter }
      }, executor);

      expect(result.success).toBe(true);
      expect(result.data.total).toBe(3);
      expect(result.data.succeeded).toBe(3);
      expect(result.data.failed).toBe(0);
    });

    it('should handle validation errors gracefully', async () => {
      const executor = createMockExecutor({});
      const rateLimiter = createTestRateLimiter();

      const result = await executeBatch({
        tool_name: '',
        items: [],
        options: { rateLimiter }
      }, executor);

      expect(result.success).toBe(false);
      expect(result.data.errors.length).toBeGreaterThan(0);
    });
  });

  describe('executeBatch - Concurrency', () => {
    it('should respect concurrency limit (default: 5)', async () => {
      let maxConcurrent = 0;
      let currentConcurrent = 0;

      const executor: BatchToolExecutor = async (toolName, args) => {
        currentConcurrent++;
        maxConcurrent = Math.max(maxConcurrent, currentConcurrent);
        await new Promise(resolve => setTimeout(resolve, 50));
        currentConcurrent--;
        return { success: true, result: { id: args.id } };
      };

      const rateLimiter = createTestRateLimiter();

      await executeBatch({
        tool_name: 'test',
        items: Array.from({ length: 10 }, (_, i) => ({ id: String(i) })),
        options: { rateLimiter }
      }, executor);

      expect(maxConcurrent).toBeLessThanOrEqual(5);
    });

    it('should respect custom concurrency limit', async () => {
      let maxConcurrent = 0;
      let currentConcurrent = 0;

      const executor: BatchToolExecutor = async (toolName, args) => {
        currentConcurrent++;
        maxConcurrent = Math.max(maxConcurrent, currentConcurrent);
        await new Promise(resolve => setTimeout(resolve, 30));
        currentConcurrent--;
        return { success: true, result: { id: args.id } };
      };

      const rateLimiter = createTestRateLimiter();

      await executeBatch({
        tool_name: 'test',
        items: Array.from({ length: 10 }, (_, i) => ({ id: String(i) })),
        options: { concurrency: 2, rateLimiter }
      }, executor);

      expect(maxConcurrent).toBeLessThanOrEqual(2);
    });
  });

  describe('executeBatch - Error Handling', () => {
    it('should collect failed items separately (on_error: continue)', async () => {
      const executor: BatchToolExecutor = async (toolName, args) => {
        if (args.shouldFail) {
          return { success: false, error: 'Intentional failure' };
        }
        return { success: true, result: { id: args.id } };
      };

      const rateLimiter = createTestRateLimiter();

      const result = await executeBatch({
        tool_name: 'test',
        items: [
          { id: '1', shouldFail: false },
          { id: '2', shouldFail: true },
          { id: '3', shouldFail: false },
          { id: '4', shouldFail: true }
        ],
        options: { on_error: 'continue', rateLimiter }
      }, executor);

      expect(result.success).toBe(false);
      expect(result.data.total).toBe(4);
      expect(result.data.succeeded).toBe(2);
      expect(result.data.failed).toBe(2);
      expect(result.data.errors.length).toBe(2);
    });

    it('should stop on first error (on_error: stop)', async () => {
      const executor: BatchToolExecutor = async (toolName, args) => {
        if (args.shouldFail) {
          return { success: false, error: 'Intentional failure' };
        }
        return { success: true, result: { id: args.id } };
      };

      const rateLimiter = createTestRateLimiter();

      const result = await executeBatch({
        tool_name: 'test',
        items: [
          { id: '1', shouldFail: false },
          { id: '2', shouldFail: true },
          { id: '3', shouldFail: false }
        ],
        options: { on_error: 'stop', concurrency: 1, rateLimiter }
      }, executor);

      expect(result.success).toBe(false);
      expect(result.stopped_early).toBe(true);
      // With concurrency 1 and stop on error, we process items 0,1 then stop
      expect(result.data.succeeded).toBe(1);
      expect(result.data.failed).toBe(1);
    });

    it('should include validation errors in failed items', async () => {
      const executor: BatchToolExecutor = async () => {
        return {
          success: false,
          error: 'Validation failed',
          validationErrors: ['Missing field: email', 'Invalid phone format']
        };
      };

      const rateLimiter = createTestRateLimiter();

      const result = await executeBatch({
        tool_name: 'test',
        items: [{ id: '1' }],
        options: { result_mode: 'detail', rateLimiter }
      }, executor);

      const detailResult = result.data as BatchDetailResult;
      expect(detailResult.errors[0].validation_errors).toBeDefined();
      expect(detailResult.errors[0].validation_errors?.length).toBe(2);
    });
  });

  describe('executeBatch - Result Modes', () => {
    it('should return summary mode by default', async () => {
      const executor = createMockExecutor((args) => ({ id: args.id, data: 'lots of data' }));
      const rateLimiter = createTestRateLimiter();

      const result = await executeBatch({
        tool_name: 'test',
        items: [{ id: '1' }, { id: '2' }],
        options: { rateLimiter }
      }, executor);

      const summaryResult = result.data as BatchSummaryResult;
      expect(summaryResult.total).toBe(2);
      expect(summaryResult.succeeded).toBe(2);
      expect(summaryResult.failed).toBe(0);
      // Summary mode should not include full results
      expect((summaryResult as any).results).toBeUndefined();
    });

    it('should return detail mode with all results', async () => {
      const executor = createMockExecutor((args) => ({ id: args.id, name: `Item ${args.id}` }));
      const rateLimiter = createTestRateLimiter();

      const result = await executeBatch({
        tool_name: 'test',
        items: [{ id: '1' }, { id: '2' }, { id: '3' }],
        options: { result_mode: 'detail', rateLimiter }
      }, executor);

      const detailResult = result.data as BatchDetailResult;
      expect(detailResult.results.length).toBe(3);
      expect(detailResult.results[0].result).toEqual({ id: '1', name: 'Item 1' });
    });

    it('should apply field projection in detail mode', async () => {
      const executor = createMockExecutor((args) => ({
        id: args.id,
        name: `Item ${args.id}`,
        extra: 'should be removed',
        nested: { value: 42 }
      }));
      const rateLimiter = createTestRateLimiter();

      const result = await executeBatch({
        tool_name: 'test',
        items: [{ id: '1' }, { id: '2' }],
        options: {
          result_mode: 'detail',
          select_fields: ['id', 'name'],
          rateLimiter
        }
      }, executor);

      const detailResult = result.data as BatchDetailResult;
      expect(detailResult.results[0].result).toEqual({ id: '1', name: 'Item 1' });
      expect((detailResult.results[0].result as any).extra).toBeUndefined();
    });
  });

  describe('executeBatch - Rate Limiting', () => {
    it('should include rate limit state in response', async () => {
      const executor = createMockExecutor((args) => ({ id: args.id }));
      const rateLimiter = createTestRateLimiter();

      const result = await executeBatch({
        tool_name: 'test',
        items: [{ id: '1' }, { id: '2' }, { id: '3' }],
        options: { rateLimiter }
      }, executor);

      expect(result.rate_limit_state).toBeDefined();
      expect(result.rate_limit_state?.tokens_remaining).toBeDefined();
      expect(result.rate_limit_state?.tokens_remaining).toBeLessThanOrEqual(100);
    });

    it('should consume tokens from rate limiter', async () => {
      const executor = createMockExecutor((args) => ({ id: args.id }));
      const rateLimiter = createTestRateLimiter();

      const initialTokens = rateLimiter.getAvailableTokens();

      await executeBatch({
        tool_name: 'test',
        items: Array.from({ length: 5 }, (_, i) => ({ id: String(i) })),
        options: { rateLimiter }
      }, executor);

      const finalTokens = rateLimiter.getAvailableTokens();
      expect(finalTokens).toBe(initialTokens - 5);
    });
  });

  describe('executeBatch - Large Batches', () => {
    it('should handle batch of 50 items without timeout (Criterion 6)', async () => {
      const executor = createMockExecutor((args) => ({ id: args.id, processed: true }), 10);
      const rateLimiter = createTestRateLimiter();

      const startTime = Date.now();
      const result = await executeBatch({
        tool_name: 'test',
        items: Array.from({ length: 50 }, (_, i) => ({ id: String(i) })),
        options: { concurrency: 5, rateLimiter }
      }, executor);
      const duration = Date.now() - startTime;

      expect(result.success).toBe(true);
      expect(result.data.total).toBe(50);
      expect(result.data.succeeded).toBe(50);
      expect(result.data.failed).toBe(0);
      // With 50 items, 5 concurrency, 10ms each = ~100ms minimum
      // Should complete reasonably fast (under 5s)
      expect(duration).toBeLessThan(5000);
    }, 10000);

    it('should track duration accurately', async () => {
      const executor = createMockExecutor((args) => ({ id: args.id }), 20);
      const rateLimiter = createTestRateLimiter();

      const result = await executeBatch({
        tool_name: 'test',
        items: Array.from({ length: 5 }, (_, i) => ({ id: String(i) })),
        options: { concurrency: 5, rateLimiter }
      }, executor);

      expect(result.data.duration_ms).toBeGreaterThanOrEqual(20);
    });
  });

  describe('executeBatch - Integration Scenarios', () => {
    it('should process bulk contact updates', async () => {
      const contacts = [
        { contactId: 'c1', name: 'John', email: 'john@test.com' },
        { contactId: 'c2', name: 'Jane', email: 'jane@test.com' },
        { contactId: 'c3', name: 'Bob', email: 'bob@test.com' }
      ];

      const executor: BatchToolExecutor = async (toolName, args) => {
        return {
          success: true,
          result: {
            id: args.contactId,
            updated: true,
            updatedFields: ['name', 'email']
          }
        };
      };

      const rateLimiter = createTestRateLimiter();

      const result = await executeBatch({
        tool_name: 'update_contact',
        items: contacts,
        options: {
          result_mode: 'detail',
          select_fields: ['id', 'updated'],
          rateLimiter
        }
      }, executor);

      expect(result.success).toBe(true);
      const detailResult = result.data as BatchDetailResult;
      expect(detailResult.results.length).toBe(3);
      expect(detailResult.results.every(r => (r.result as any).updated)).toBe(true);
    });

    it('should send bulk SMS messages', async () => {
      const messages = [
        { contactId: 'c1', phone: '+1111', message: 'Hello 1' },
        { contactId: 'c2', phone: '+2222', message: 'Hello 2' },
        { contactId: 'c3', phone: '+3333', message: 'Hello 3' }
      ];

      const executor: BatchToolExecutor = async (toolName, args) => {
        return {
          success: true,
          result: {
            messageId: `msg_${args.contactId}`,
            status: 'queued',
            phone: args.phone
          }
        };
      };

      const rateLimiter = createTestRateLimiter();

      const result = await executeBatch({
        tool_name: 'send_sms',
        items: messages,
        options: { rateLimiter }
      }, executor);

      expect(result.success).toBe(true);
      expect(result.data.succeeded).toBe(3);
    });
  });
});
