/**
 * Unit Tests for Pipeline Executor
 * Tests multi-step workflow execution
 */

import { describe, it, expect, jest } from '@jest/globals';
import {
  executePipeline,
  validatePipeline,
  applyReturnTemplate,
  PipelineRequest,
  ToolExecutor
} from '../../src/execution/pipeline-executor.js';
import { RateLimiter } from '../../src/execution/rate-limiter.js';
import { createMockExecutor as createMockExecutorV2 } from '../mocks/ghl-api-client.mock-2.js';

// Wrapper to maintain backwards compatibility with existing test code
// Old signature: createMockExecutor({ tool_name: result })
// New v2 signature: createMockExecutor({ results: { tool_name: result } })
const createMockExecutor = (results: Record<string, unknown>): ToolExecutor => {
  return createMockExecutorV2({ results });
};

// Create a mock rate limiter that always grants tokens immediately
const createMockRateLimiter = (): RateLimiter => {
  return new RateLimiter({
    maxTokens: 1000,
    refillRate: 1000,
    refillIntervalMs: 100
  });
};

describe('Pipeline Executor', () => {

  describe('validatePipeline', () => {
    it('should pass valid pipeline', () => {
      const pipeline: PipelineRequest = {
        steps: [
          { id: 'step1', tool_name: 'search', args: { query: 'test' } },
          { id: 'step2', tool_name: 'process', args: { id: '{{step1.id}}' } }
        ]
      };
      expect(validatePipeline(pipeline)).toEqual([]);
    });

    it('should reject empty steps array', () => {
      const errors = validatePipeline({ steps: [] });
      expect(errors).toContain('Pipeline must have at least one step');
    });

    it('should reject missing steps', () => {
      const errors = validatePipeline({} as any);
      expect(errors).toContain('Pipeline must have a "steps" array');
    });

    it('should reject missing step id', () => {
      const errors = validatePipeline({
        steps: [{ tool_name: 'test', args: {} }] as any
      });
      expect(errors.some(e => e.includes('missing "id"'))).toBe(true);
    });

    it('should reject duplicate step ids', () => {
      const errors = validatePipeline({
        steps: [
          { id: 'same', tool_name: 'a', args: {} },
          { id: 'same', tool_name: 'b', args: {} }
        ]
      });
      expect(errors.some(e => e.includes('duplicate step id'))).toBe(true);
    });

    it('should reject missing tool_name', () => {
      const errors = validatePipeline({
        steps: [{ id: 'step1', args: {} }] as any
      });
      expect(errors.some(e => e.includes('missing "tool_name"'))).toBe(true);
    });

    it('should reject reference to unknown step', () => {
      const errors = validatePipeline({
        steps: [
          { id: 'step1', tool_name: 'test', args: { ref: '{{unknown.id}}' } }
        ]
      });
      expect(errors.some(e => e.includes('references unknown step'))).toBe(true);
    });

    it('should reject forward reference', () => {
      const errors = validatePipeline({
        steps: [
          { id: 'step1', tool_name: 'test', args: { ref: '{{step2.id}}' } },
          { id: 'step2', tool_name: 'test', args: {} }
        ]
      });
      expect(errors.some(e => e.includes("hasn't executed yet"))).toBe(true);
    });

    it('should reject invalid delay_ms', () => {
      const errors = validatePipeline({
        steps: [
          { id: 'step1', tool_name: 'test', args: {}, delay_ms: -100 }
        ]
      });
      expect(errors.some(e => e.includes('delay_ms'))).toBe(true);
    });

    it('should reject excessive delay_ms', () => {
      const errors = validatePipeline({
        steps: [
          { id: 'step1', tool_name: 'test', args: {}, delay_ms: 60000 }
        ]
      });
      expect(errors.some(e => e.includes('delay_ms') && e.includes('30 seconds'))).toBe(true);
    });

    it('should validate return template references', () => {
      const errors = validatePipeline({
        steps: [{ id: 'step1', tool_name: 'test', args: {} }],
        return: { nonexistent: ['id'] }
      });
      expect(errors.some(e => e.includes('unknown step'))).toBe(true);
    });
  });

  describe('applyReturnTemplate', () => {
    it('should extract specified fields from steps', () => {
      const context = {
        search: { id: '123', name: 'Test', extra: 'data' },
        verify: { status: 'ok', details: { code: 200 } }
      };
      const template = {
        search: ['id', 'name'],
        verify: ['status']
      };

      const result = applyReturnTemplate(context, template);
      expect(result.result).toEqual({
        search: { id: '123', name: 'Test' },
        verify: { status: 'ok' }
      });
      expect(result.warnings).toBeUndefined();
    });

    it('should handle missing steps gracefully', () => {
      const context = { step1: { id: '1' } };
      const template = { step1: ['id'], missing: ['x'] };

      const result = applyReturnTemplate(context, template);
      expect(result.result).toEqual({ step1: { id: '1' } });
      expect(result.warnings).toContain('Step "missing" not found in context');
    });
  });

  describe('executePipeline', () => {
    it('should execute single step pipeline', async () => {
      const executor = createMockExecutor({
        search_contacts: [{ id: 'c1', name: 'John' }]
      });

      const result = await executePipeline({
        steps: [
          { id: 'search', tool_name: 'search_contacts', args: { query: 'John' } }
        ]
      }, executor);

      expect(result.success).toBe(true);
      expect(result.steps_completed).toBe(1);
      expect(result.result).toEqual([{ id: 'c1', name: 'John' }]);
    });

    it('should execute multi-step pipeline with variable passing', async () => {
      const executor = createMockExecutor({
        search_contacts: [{ id: 'c1', name: 'John' }],
        get_contact: (args: any) => ({ id: args.contactId, email: 'john@test.com' })
      });

      const result = await executePipeline({
        steps: [
          { id: 'search', tool_name: 'search_contacts', args: { query: 'John' } },
          { id: 'details', tool_name: 'get_contact', args: { contactId: '{{search[0].id}}' } }
        ]
      }, executor);

      expect(result.success).toBe(true);
      expect(result.steps_completed).toBe(2);
      expect(result.result).toEqual({ id: 'c1', email: 'john@test.com' });
    });

    it('should apply return template', async () => {
      const executor = createMockExecutor({
        step_a: { id: '1', data: 'a', extra: 'x' },
        step_b: { id: '2', data: 'b', extra: 'y' }
      });

      const result = await executePipeline({
        steps: [
          { id: 'a', tool_name: 'step_a', args: {} },
          { id: 'b', tool_name: 'step_b', args: {} }
        ],
        return: {
          a: ['id'],
          b: ['data']
        }
      }, executor);

      expect(result.success).toBe(true);
      expect(result.result).toEqual({
        a: { id: '1' },
        b: { data: 'b' }
      });
    });

    it('should stop on step failure', async () => {
      const executor = createMockExecutor({
        step_a: { id: '1' },
        fail_step: null // This will fail
      });

      const result = await executePipeline({
        steps: [
          { id: 'a', tool_name: 'step_a', args: {} },
          { id: 'b', tool_name: 'fail_step', args: {} },
          { id: 'c', tool_name: 'step_a', args: {} }
        ]
      }, executor);

      expect(result.success).toBe(false);
      expect(result.steps_completed).toBe(1);
      expect(result.error?.step_id).toBe('b');
      expect(result.step_results).toBeDefined();
    });

    it('should handle validation errors', async () => {
      const executor = createMockExecutor({});

      const result = await executePipeline({
        steps: []
      }, executor);

      expect(result.success).toBe(false);
      expect(result.error?.step_id).toBe('_validation');
      expect(result.error?.validation_errors).toBeDefined();
    });

    it('should measure execution duration', async () => {
      const executor = createMockExecutor({
        test: { ok: true }
      });

      const result = await executePipeline({
        steps: [{ id: 's1', tool_name: 'test', args: {} }]
      }, executor);

      expect(result.duration_ms).toBeGreaterThanOrEqual(0);
    });

    it('should apply delay between steps', async () => {
      const executor = createMockExecutor({
        test: { ok: true }
      });

      const startTime = Date.now();
      const result = await executePipeline({
        steps: [
          { id: 's1', tool_name: 'test', args: {} },
          { id: 's2', tool_name: 'test', args: {}, delay_ms: 50 }
        ]
      }, executor);
      const elapsed = Date.now() - startTime;

      expect(result.success).toBe(true);
      expect(elapsed).toBeGreaterThanOrEqual(50);
    });

    it('should resolve nested variable references', async () => {
      const executor = createMockExecutor({
        get_user: { profile: { contact: { email: 'user@test.com' } } },
        send_email: (args: any) => ({ sent_to: args.to })
      });

      const result = await executePipeline({
        steps: [
          { id: 'user', tool_name: 'get_user', args: {} },
          { id: 'send', tool_name: 'send_email', args: { to: '{{user.profile.contact.email}}' } }
        ]
      }, executor);

      expect(result.success).toBe(true);
      expect(result.result).toEqual({ sent_to: 'user@test.com' });
    });

    it('should handle complex workflow: search → filter → action', async () => {
      const contacts = [
        { id: 'c1', name: 'John', status: 'active' },
        { id: 'c2', name: 'Jane', status: 'inactive' },
        { id: 'c3', name: 'Bob', status: 'active' }
      ];

      const executor = createMockExecutor({
        search_contacts: contacts,
        send_sms: (args: any) => ({
          message_id: 'msg_123',
          sent_to: args.contactId,
          text: args.message
        })
      });

      const result = await executePipeline({
        steps: [
          {
            id: 'search',
            tool_name: 'search_contacts',
            args: { query: 'all' }
          },
          {
            id: 'notify',
            tool_name: 'send_sms',
            args: {
              contactId: '{{search[0].id}}',
              message: 'Hello {{search[0].name}}!'
            }
          }
        ],
        return: {
          notify: ['message_id', 'sent_to']
        }
      }, executor);

      expect(result.success).toBe(true);
      expect(result.result).toEqual({
        notify: { message_id: 'msg_123', sent_to: 'c1' }
      });
    });

    it('should include complete results in step_results for partial recovery', async () => {
      const executor = createMockExecutor({
        step_a: { id: '1', data: 'important_data_a' },
        step_b: { id: '2', data: 'important_data_b' },
        fail_step: null
      });

      const result = await executePipeline({
        steps: [
          { id: 'a', tool_name: 'step_a', args: {} },
          { id: 'b', tool_name: 'step_b', args: {} },
          { id: 'c', tool_name: 'fail_step', args: {} }
        ]
      }, executor);

      expect(result.success).toBe(false);
      expect(result.step_results).toBeDefined();
      // Verify step_results contains complete data, not just metadata
      expect(result.step_results?.a).toMatchObject({
        success: true,
        result: { id: '1', data: 'important_data_a' }
      });
      expect(result.step_results?.b).toMatchObject({
        success: true,
        result: { id: '2', data: 'important_data_b' }
      });
    });

    it('should timeout when pipeline exceeds timeout_ms', async () => {
      const slowExecutor: ToolExecutor = async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return { success: true, result: { ok: true } };
      };

      const result = await executePipeline({
        steps: [
          { id: 's1', tool_name: 'slow', args: {} },
          { id: 's2', tool_name: 'slow', args: {} },
          { id: 's3', tool_name: 'slow', args: {} }
        ],
        timeout_ms: 50  // Very short timeout
      }, slowExecutor);

      // Should timeout after first step completes
      expect(result.success).toBe(false);
      expect(result.timed_out).toBe(true);
      expect(result.error?.message).toContain('timeout');
    });

    it('should execute full 4-step workflow: search → filter → send_sms → verify (Criteriul 7)', async () => {
      // Simulates: search contacts → filter by status → send SMS → verify delivery
      const executor = createMockExecutor({
        search_contacts: (args: any) => [
          { id: 'c1', name: 'John', phone: '+1111', status: 'active' },
          { id: 'c2', name: 'Jane', phone: '+2222', status: 'inactive' },
          { id: 'c3', name: 'Bob', phone: '+3333', status: 'active' }
        ],
        filter_contacts: (args: any) => {
          // Filter active contacts
          const contacts = args.contacts || [];
          return contacts.filter((c: any) => c.status === args.status);
        },
        send_sms: (args: any) => ({
          message_id: `msg_${Date.now()}`,
          contact_id: args.contactId,
          phone: args.phone,
          status: 'queued'
        }),
        verify_delivery: (args: any) => ({
          message_id: args.messageId,
          delivered: true,
          delivered_at: new Date().toISOString()
        })
      });

      const result = await executePipeline({
        steps: [
          {
            id: 'search',
            tool_name: 'search_contacts',
            args: { query: 'all', limit: 100 }
          },
          {
            id: 'filter',
            tool_name: 'filter_contacts',
            args: {
              contacts: '{{search}}',
              status: 'active'
            }
          },
          {
            id: 'send',
            tool_name: 'send_sms',
            args: {
              contactId: '{{filter[0].id}}',
              phone: '{{filter[0].phone}}',
              message: 'Hello {{filter[0].name}}!'
            }
          },
          {
            id: 'verify',
            tool_name: 'verify_delivery',
            args: {
              messageId: '{{send.message_id}}'
            }
          }
        ],
        return: {
          send: ['message_id', 'status'],
          verify: ['delivered']
        }
      }, executor);

      expect(result.success).toBe(true);
      expect(result.steps_completed).toBe(4);
      expect(result.total_steps).toBe(4);
      // Verify return template produces summary only
      expect(result.result).toEqual({
        send: { message_id: expect.any(String), status: 'queued' },
        verify: { delivered: true }
      });
    });

    it('should validate timeout_ms bounds', () => {
      const errors1 = validatePipeline({
        steps: [{ id: 's1', tool_name: 'test', args: {} }],
        timeout_ms: -100
      });
      expect(errors1.some(e => e.includes('timeout_ms'))).toBe(true);

      const errors2 = validatePipeline({
        steps: [{ id: 's1', tool_name: 'test', args: {} }],
        timeout_ms: 500000  // > 5 min
      });
      expect(errors2.some(e => e.includes('timeout_ms') && e.includes('300000'))).toBe(true);
    });

    it('should reject pipelines with more than 20 steps', () => {
      const steps = Array.from({ length: 25 }, (_, i) => ({
        id: `step_${i}`,
        tool_name: 'test',
        args: {}
      }));

      const errors = validatePipeline({ steps });
      expect(errors.some(e => e.includes('20 steps'))).toBe(true);
    });
  });

  describe('Loop Support', () => {
    it('should validate loop property is a variable reference', () => {
      const errors = validatePipeline({
        steps: [
          { id: 'data', tool_name: 'get_data', args: {} },
          { id: 'loop', tool_name: 'process', args: {}, loop: 'not_a_variable' }
        ]
      });
      expect(errors.some(e => e.includes('loop') && e.includes('variable reference'))).toBe(true);
    });

    it('should reject filter without loop', () => {
      const errors = validatePipeline({
        steps: [
          { id: 'step1', tool_name: 'test', args: {}, filter: '{{item.active}}' }
        ]
      });
      expect(errors.some(e => e.includes('filter') && e.includes('loop'))).toBe(true);
    });

    it('should reject concurrency without loop', () => {
      const errors = validatePipeline({
        steps: [
          { id: 'step1', tool_name: 'test', args: {}, concurrency: 5 }
        ]
      });
      expect(errors.some(e => e.includes('concurrency') && e.includes('loop'))).toBe(true);
    });

    it('should reject invalid concurrency value', () => {
      const errors = validatePipeline({
        steps: [
          { id: 'data', tool_name: 'get', args: {} },
          { id: 'loop', tool_name: 'process', args: {}, loop: '{{data.items}}', concurrency: 20 }
        ]
      });
      expect(errors.some(e => e.includes('concurrency') && e.includes('10'))).toBe(true);
    });

    it('should execute loop over array', async () => {
      const processedItems: unknown[] = [];
      const executor = createMockExecutor({
        get_items: [
          { id: '1', name: 'Item 1' },
          { id: '2', name: 'Item 2' },
          { id: '3', name: 'Item 3' }
        ],
        process_item: (args: any) => {
          processedItems.push(args);
          return { processed: args.id, name: args.name };
        }
      });

      const result = await executePipeline({
        steps: [
          { id: 'items', tool_name: 'get_items', args: {} },
          {
            id: 'processed',
            tool_name: 'process_item',
            args: { id: '{{item.id}}', name: '{{item.name}}' },
            loop: '{{items}}'
          }
        ],
        _rateLimiter: createMockRateLimiter()
      }, executor);

      expect(result.success).toBe(true);
      expect(result.steps_completed).toBe(2);
      expect(processedItems).toHaveLength(3);
      expect(Array.isArray(result.result)).toBe(true);
      expect((result.result as unknown[]).length).toBe(3);
    });

    it('should use {{item}} and {{index}} in loop', async () => {
      const calls: unknown[] = [];
      const executor = createMockExecutor({
        get_data: ['a', 'b', 'c'],
        log: (args: any) => {
          calls.push(args);
          return { logged: true };
        }
      });

      const result = await executePipeline({
        steps: [
          { id: 'data', tool_name: 'get_data', args: {} },
          {
            id: 'logs',
            tool_name: 'log',
            args: { value: '{{item}}', position: '{{index}}' },
            loop: '{{data}}'
          }
        ],
        _rateLimiter: createMockRateLimiter()
      }, executor);

      expect(result.success).toBe(true);
      expect(calls).toEqual([
        { value: 'a', position: 0 },
        { value: 'b', position: 1 },
        { value: 'c', position: 2 }
      ]);
    });

    it('should filter loop items', async () => {
      const processed: unknown[] = [];
      const executor = createMockExecutor({
        get_contacts: [
          { id: '1', active: true },
          { id: '2', active: false },
          { id: '3', active: true },
          { id: '4', active: false }
        ],
        notify: (args: any) => {
          processed.push(args.id);
          return { notified: args.id };
        }
      });

      const result = await executePipeline({
        steps: [
          { id: 'contacts', tool_name: 'get_contacts', args: {} },
          {
            id: 'notified',
            tool_name: 'notify',
            args: { id: '{{item.id}}' },
            loop: '{{contacts}}',
            filter: '{{item.active}}'
          }
        ],
        _rateLimiter: createMockRateLimiter()
      }, executor);

      expect(result.success).toBe(true);
      // Only active contacts should be processed
      expect(processed).toEqual(['1', '3']);
      expect((result.result as unknown[]).length).toBe(2);
    });

    it('should filter by array length', async () => {
      const processed: unknown[] = [];
      const executor = createMockExecutor({
        get_contacts: [
          { id: '1', conversations: ['c1', 'c2'] },
          { id: '2', conversations: [] },
          { id: '3', conversations: ['c3'] }
        ],
        get_last_message: (args: any) => {
          processed.push(args.contactId);
          return { lastMessage: 'Hello' };
        }
      });

      const result = await executePipeline({
        steps: [
          { id: 'contacts', tool_name: 'get_contacts', args: {} },
          {
            id: 'messages',
            tool_name: 'get_last_message',
            args: { contactId: '{{item.id}}' },
            loop: '{{contacts}}',
            filter: '{{item.conversations}}'  // Filters out empty arrays
          }
        ],
        _rateLimiter: createMockRateLimiter()
      }, executor);

      expect(result.success).toBe(true);
      expect(processed).toEqual(['1', '3']);
    });

    it('should handle empty loop array gracefully', async () => {
      const executor = createMockExecutor({
        get_items: [],
        process: () => ({ ok: true })
      });

      const result = await executePipeline({
        steps: [
          { id: 'items', tool_name: 'get_items', args: {} },
          {
            id: 'processed',
            tool_name: 'process',
            args: { id: '{{item.id}}' },
            loop: '{{items}}'
          }
        ],
        _rateLimiter: createMockRateLimiter()
      }, executor);

      expect(result.success).toBe(true);
      expect(result.result).toEqual([]);
    });

    it('should fail if loop reference is not an array', async () => {
      const executor = createMockExecutor({
        get_single: { id: '1', name: 'Not an array' }
      });

      const result = await executePipeline({
        steps: [
          { id: 'single', tool_name: 'get_single', args: {} },
          {
            id: 'loop',
            tool_name: 'process',
            args: {},
            loop: '{{single}}'
          }
        ],
        _rateLimiter: createMockRateLimiter()
      }, executor);

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('did not resolve to an array');
    });

    it('should respect concurrency in loop execution', async () => {
      let currentConcurrent = 0;
      let maxConcurrent = 0;

      // Custom executor that tracks concurrent executions
      const customExecutor: ToolExecutor = async (toolName: string) => {
        if (toolName === 'get_items') {
          return { success: true, result: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] };
        }
        // slow_process
        currentConcurrent++;
        maxConcurrent = Math.max(maxConcurrent, currentConcurrent);
        await new Promise(resolve => setTimeout(resolve, 20));
        currentConcurrent--;
        return { success: true, result: { ok: true } };
      };

      const result = await executePipeline({
        steps: [
          { id: 'items', tool_name: 'get_items', args: {} },
          {
            id: 'processed',
            tool_name: 'slow_process',
            args: {},
            loop: '{{items}}',
            concurrency: 3
          }
        ],
        _rateLimiter: createMockRateLimiter()
      }, customExecutor);

      expect(result.success).toBe(true);
      // Max concurrent should not exceed 3
      expect(maxConcurrent).toBeLessThanOrEqual(3);
    });

    it('should chain loop results to next step', async () => {
      const executor = createMockExecutor({
        get_ids: ['a', 'b', 'c'],
        fetch_details: (args: any) => ({ id: args.id, detail: `detail_${args.id}` }),
        summarize: (args: any) => ({
          count: args.items.length,
          ids: args.items.map((i: any) => i.id)
        })
      });

      const result = await executePipeline({
        steps: [
          { id: 'ids', tool_name: 'get_ids', args: {} },
          {
            id: 'details',
            tool_name: 'fetch_details',
            args: { id: '{{item}}' },
            loop: '{{ids}}'
          },
          {
            id: 'summary',
            tool_name: 'summarize',
            args: { items: '{{details}}' }
          }
        ],
        _rateLimiter: createMockRateLimiter()
      }, executor);

      expect(result.success).toBe(true);
      expect(result.result).toEqual({
        count: 3,
        ids: ['a', 'b', 'c']
      });
    });

    it('should handle nested loops (loop result used in another loop)', async () => {
      const executor = createMockExecutor({
        get_users: [{ id: 'u1' }, { id: 'u2' }],
        get_user_posts: (args: any) => [
          { id: `${args.userId}_p1` },
          { id: `${args.userId}_p2` }
        ],
        count_total: (args: any) => ({ total: args.posts.length })
      });

      const result = await executePipeline({
        steps: [
          { id: 'users', tool_name: 'get_users', args: {} },
          {
            id: 'posts',
            tool_name: 'get_user_posts',
            args: { userId: '{{item.id}}' },
            loop: '{{users}}'
          },
          {
            id: 'count',
            tool_name: 'count_total',
            // posts will be [[p1, p2], [p1, p2]]
            args: { posts: '{{posts}}' }
          }
        ],
        _rateLimiter: createMockRateLimiter()
      }, executor);

      expect(result.success).toBe(true);
      // Each user returns 2 posts, so posts array has 2 arrays of 2 items each
      expect(result.result).toEqual({ total: 2 });
    });
  });

  describe('Real-world projection issues (from production testing)', () => {
    it('should project array fields with [*] syntax', async () => {
      const executor = createMockExecutor({
        search_contacts: {
          contacts: [
            { firstName: 'Mihaela', lastName: 'Visan', email: 'miha@test.com', tags: ['vip'] },
            { firstName: 'Adelina', lastName: 'Petrisor', email: 'adelina@test.com', tags: ['customer'] }
          ],
          total: 107229
        }
      });

      const result = await executePipeline({
        steps: [
          { id: 'search', tool_name: 'search_contacts', args: { limit: 2 } }
        ],
        return: {
          search: ['contacts[*].firstName', 'contacts[*].email', 'total']
        }
      }, executor);

      expect(result.success).toBe(true);
      expect(result.result).toEqual({
        search: {
          contacts: {
            firstName: ['Mihaela', 'Adelina'],
            email: ['miha@test.com', 'adelina@test.com']
          },
          total: 107229
        }
      });
      expect(result.warnings).toBeUndefined();
    });

    it('should warn when projection path not found', async () => {
      const executor = createMockExecutor({
        get_data: {
          data: { id: 1, name: 'Test' }
        }
      });

      const result = await executePipeline({
        steps: [
          { id: 'fetch', tool_name: 'get_data', args: {} }
        ],
        return: {
          fetch: ['data.id', 'data.nonexistent', 'missing.field']
        }
      }, executor);

      expect(result.success).toBe(true);
      expect(result.result).toEqual({
        fetch: {
          data: { id: 1 }
        }
      });
      expect(result.warnings).toBeDefined();
      expect(result.warnings).toContain('[fetch] Field "data.nonexistent" not found in result');
      expect(result.warnings).toContain('[fetch] Field "missing.field" not found in result');
    });

    it('should handle loop where tool needs item data', async () => {
      const executor = createMockExecutor({
        search_contacts: {
          contacts: [
            { id: 'c1', name: 'Contact 1' },
            { id: 'c2', name: 'Contact 2' }
          ]
        },
        get_contact_conversations: (args: any) => ({
          messages: [`msg_${args.contactId}`],
          contactId: args.contactId
        })
      });

      const result = await executePipeline({
        steps: [
          { id: 'contacts', tool_name: 'search_contacts', args: { limit: 2 } },
          {
            id: 'conversations',
            tool_name: 'get_contact_conversations',
            args: { contactId: '{{item.id}}' },
            loop: '{{contacts.contacts}}'
          }
        ],
        _rateLimiter: createMockRateLimiter()
      }, executor);

      expect(result.success).toBe(true);
      expect(result.result).toHaveLength(2);
      expect(result.result).toEqual([
        { messages: ['msg_c1'], contactId: 'c1' },
        { messages: ['msg_c2'], contactId: 'c2' }
      ]);
    });

    it('should project nested wildcard paths with deep nesting', async () => {
      const executor = createMockExecutor({
        search_opportunities: {
          opportunities: [
            { id: 'opp1', contact: { firstName: 'John', email: 'john@test.com' }, monetaryValue: 5000 },
            { id: 'opp2', contact: { firstName: 'Jane', email: 'jane@test.com' }, monetaryValue: 10000 },
            { id: 'opp3', contact: { firstName: 'Bob', email: 'bob@test.com' }, monetaryValue: 7500 }
          ],
          meta: { total: 57167 }
        }
      });

      const result = await executePipeline({
        steps: [
          { id: 'opps', tool_name: 'search_opportunities', args: { limit: 3 } }
        ],
        return: {
          opps: ['opportunities[*].contact.firstName', 'opportunities[*].monetaryValue', 'meta.total']
        }
      }, executor);

      expect(result.success).toBe(true);
      expect(result.result).toEqual({
        opps: {
          opportunities: {
            contact: {
              firstName: ['John', 'Jane', 'Bob']
            },
            monetaryValue: [5000, 10000, 7500]
          },
          meta: { total: 57167 }
        }
      });
    });

    it('should combine loop results with return template projection', async () => {
      const executor = createMockExecutor({
        get_pipelines: [
          { id: 'pipe1', name: 'Sales' },
          { id: 'pipe2', name: 'Webinars' }
        ],
        search_opportunities: (args: any) => ({
          pipelineId: args.pipelineId,
          total: args.pipelineId === 'pipe1' ? 1500 : 287
        })
      });

      const result = await executePipeline({
        steps: [
          { id: 'pipelines', tool_name: 'get_pipelines', args: {} },
          {
            id: 'opp_counts',
            tool_name: 'search_opportunities',
            args: { pipelineId: '{{item.id}}', limit: 1 },
            loop: '{{pipelines}}'
          }
        ],
        _rateLimiter: createMockRateLimiter()
      }, executor);

      expect(result.success).toBe(true);
      // Loop returns array of results
      expect(result.result).toEqual([
        { pipelineId: 'pipe1', total: 1500 },
        { pipelineId: 'pipe2', total: 287 }
      ]);
    });

    it('should aggregate pipeline stats using loop', async () => {
      // This tests the real-world use case from production:
      // Get totals from multiple pipelines in a single pipeline execution
      const executor = createMockExecutor({
        search_opportunities: (args: any) => {
          const totals: Record<string, number> = {
            'pipe_main': 1287,
            'pipe_webinars': 287,
            'pipe_events': 156
          };
          return {
            opportunities: [],
            meta: { total: totals[args.pipelineId] || 0 }
          };
        }
      });

      const result = await executePipeline({
        steps: [
          { id: 'main', tool_name: 'search_opportunities', args: { pipelineId: 'pipe_main', limit: 1 } },
          { id: 'webinars', tool_name: 'search_opportunities', args: { pipelineId: 'pipe_webinars', limit: 1 } },
          { id: 'events', tool_name: 'search_opportunities', args: { pipelineId: 'pipe_events', limit: 1 } }
        ],
        return: {
          main: ['meta.total'],
          webinars: ['meta.total'],
          events: ['meta.total']
        }
      }, executor);

      expect(result.success).toBe(true);
      expect(result.result).toEqual({
        main: { meta: { total: 1287 } },
        webinars: { meta: { total: 287 } },
        events: { meta: { total: 156 } }
      });
    });
  });
});
