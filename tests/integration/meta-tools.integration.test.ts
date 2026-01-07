/**
 * Integration Tests for Meta-Tools
 *
 * Tests the complete execution flow of execute_pipeline and execute_batch
 * with realistic scenarios that simulate actual GHL API usage.
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { executePipeline, ToolExecutor, PipelineRequest } from '../../src/execution/pipeline-executor.js';
import { executeBatch, BatchToolExecutor, BatchRequest } from '../../src/execution/batch-executor.js';
import { RateLimiter } from '../../src/execution/rate-limiter.js';

// Create mock rate limiter for tests
const createTestRateLimiter = (): RateLimiter => {
  return new RateLimiter({
    maxTokens: 1000,
    refillRate: 1000,
    refillIntervalMs: 100
  });
};

describe('Meta-Tools Integration', () => {
  describe('Pipeline with Loops', () => {
    /**
     * Integration Test: Search contacts → Get conversations for each → Get last message
     * This simulates a realistic workflow where we:
     * 1. Search for contacts matching a query
     * 2. For each contact, get their conversations
     * 3. For each contact with conversations, get the last message
     */
    it('should execute search → loop conversations → loop SMS workflow', async () => {
      // Mock data simulating GHL API responses
      const mockContacts = [
        { id: 'c1', firstName: 'John', email: 'john@test.com' },
        { id: 'c2', firstName: 'Jane', email: 'jane@test.com' },
        { id: 'c3', firstName: 'Bob', email: 'bob@test.com' }
      ];

      const mockConversations: Record<string, unknown[]> = {
        'c1': [{ id: 'conv1', lastMessageAt: '2025-01-01' }],
        'c2': [], // No conversations
        'c3': [{ id: 'conv3', lastMessageAt: '2025-01-02' }, { id: 'conv3b', lastMessageAt: '2025-01-03' }]
      };

      const mockMessages: Record<string, unknown> = {
        'conv1': { id: 'msg1', body: 'Hello John!', direction: 'inbound' },
        'conv3': { id: 'msg3', body: 'Hey Bob!', direction: 'outbound' },
        'conv3b': { id: 'msg3b', body: 'Thanks!', direction: 'inbound' }
      };

      // Executor that simulates GHL API calls
      const executor: ToolExecutor = async (toolName: string, args: Record<string, unknown>) => {
        switch (toolName) {
          case 'search_contacts':
            return { success: true, result: { contacts: mockContacts } };

          case 'search_conversations':
            const contactId = args.contactId as string;
            return {
              success: true,
              result: { conversations: mockConversations[contactId] || [] }
            };

          case 'get_conversation':
            const convId = args.conversationId as string;
            const message = mockMessages[convId];
            if (message) {
              return { success: true, result: { lastMessage: message } };
            }
            return { success: false, error: 'Conversation not found' };

          default:
            return { success: false, error: `Unknown tool: ${toolName}` };
        }
      };

      const result = await executePipeline({
        steps: [
          {
            id: 'search',
            tool_name: 'search_contacts',
            args: { query: 'test' }
          },
          {
            id: 'conversations',
            tool_name: 'search_conversations',
            args: { contactId: '{{item.id}}' },
            loop: '{{search.contacts}}'
          },
          {
            id: 'messages',
            tool_name: 'get_conversation',
            args: { conversationId: '{{item.conversations[0].id}}' },
            loop: '{{conversations}}',
            filter: '{{item.conversations}}'  // Skip contacts without conversations
          }
        ],
        _rateLimiter: createTestRateLimiter()
      }, executor);

      expect(result.success).toBe(true);
      expect(result.steps_completed).toBe(3);

      // Without return template, result is the last step's output (messages array)
      // The messages step loops over conversations and filters those with conversations
      // c1 has 1 conversation, c2 has 0, c3 has 2 - so filter passes c1 and c3
      // For c1 we get conv1's message, for c3 we get conv3's message (first one)
      const messages = result.result as unknown[];
      expect(messages.length).toBe(2);
    });

    it('should handle pipeline with loop and return template', async () => {
      const executor: ToolExecutor = async (toolName: string, args: Record<string, unknown>) => {
        if (toolName === 'get_users') {
          return {
            success: true,
            result: {
              users: [
                { id: 'u1', name: 'Alice', email: 'alice@test.com', role: 'admin' },
                { id: 'u2', name: 'Bob', email: 'bob@test.com', role: 'user' }
              ]
            }
          };
        }
        if (toolName === 'get_user_stats') {
          const userId = args.userId as string;
          return {
            success: true,
            result: {
              userId,
              logins: userId === 'u1' ? 100 : 50,
              lastActive: '2025-01-01'
            }
          };
        }
        return { success: false, error: 'Unknown tool' };
      };

      const result = await executePipeline({
        steps: [
          { id: 'users', tool_name: 'get_users', args: {} },
          {
            id: 'stats',
            tool_name: 'get_user_stats',
            args: { userId: '{{item.id}}' },
            loop: '{{users.users}}'
          }
        ],
        _rateLimiter: createTestRateLimiter()
      }, executor);

      expect(result.success).toBe(true);
      const stats = result.result as unknown[];
      expect(stats).toHaveLength(2);
      expect(stats[0]).toMatchObject({ userId: 'u1', logins: 100 });
      expect(stats[1]).toMatchObject({ userId: 'u2', logins: 50 });
    });

    it('should handle loop with filter skipping items', async () => {
      const processedIds: string[] = [];

      const executor: ToolExecutor = async (toolName: string, args: Record<string, unknown>) => {
        if (toolName === 'get_items') {
          return {
            success: true,
            result: [
              { id: '1', enabled: true, value: 10 },
              { id: '2', enabled: false, value: 20 },
              { id: '3', enabled: true, value: 30 },
              { id: '4', enabled: false, value: 40 },
              { id: '5', enabled: true, value: 50 }
            ]
          };
        }
        if (toolName === 'process_item') {
          processedIds.push(args.id as string);
          return { success: true, result: { processed: args.id } };
        }
        return { success: false, error: 'Unknown tool' };
      };

      const result = await executePipeline({
        steps: [
          { id: 'items', tool_name: 'get_items', args: {} },
          {
            id: 'processed',
            tool_name: 'process_item',
            args: { id: '{{item.id}}', value: '{{item.value}}' },
            loop: '{{items}}',
            filter: '{{item.enabled}}'
          }
        ],
        _rateLimiter: createTestRateLimiter()
      }, executor);

      expect(result.success).toBe(true);
      // Only enabled items (1, 3, 5) should be processed
      expect(processedIds).toEqual(['1', '3', '5']);
      expect((result.result as unknown[]).length).toBe(3);
    });
  });

  describe('Batch Execution', () => {
    it('should execute batch with rate limiting and parallel processing', async () => {
      const executionOrder: number[] = [];
      let currentConcurrent = 0;
      let maxConcurrent = 0;

      const executor: BatchToolExecutor = async (toolName: string, args: Record<string, unknown>) => {
        currentConcurrent++;
        maxConcurrent = Math.max(maxConcurrent, currentConcurrent);
        executionOrder.push(args.index as number);

        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 20));

        currentConcurrent--;
        return {
          success: true,
          result: { processed: args.index, data: `Result for ${args.index}` }
        };
      };

      const items = Array.from({ length: 15 }, (_, i) => ({ index: i }));

      const result = await executeBatch({
        tool_name: 'process_item',
        items,
        options: {
          concurrency: 5,
          result_mode: 'detail',
          rateLimiter: createTestRateLimiter()
        }
      }, executor);

      expect(result.success).toBe(true);
      expect(result.data.total).toBe(15);
      expect(result.data.succeeded).toBe(15);
      expect(result.data.failed).toBe(0);
      expect(maxConcurrent).toBeLessThanOrEqual(5);
    });

    it('should handle batch with mixed success/failure and continue mode', async () => {
      const executor: BatchToolExecutor = async (toolName: string, args: Record<string, unknown>) => {
        const id = args.id as number;
        // Fail on even IDs
        if (id % 2 === 0) {
          return { success: false, error: `Item ${id} failed` };
        }
        return { success: true, result: { id, status: 'ok' } };
      };

      const items = [
        { id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }
      ];

      const result = await executeBatch({
        tool_name: 'process',
        items,
        options: {
          on_error: 'continue',
          result_mode: 'detail',
          rateLimiter: createTestRateLimiter()
        }
      }, executor);

      expect(result.success).toBe(false); // Has failures
      expect(result.data.total).toBe(5);
      expect(result.data.succeeded).toBe(3); // 1, 3, 5
      expect(result.data.failed).toBe(2); // 2, 4

      const detailResult = result.data as { results: unknown[]; errors: unknown[] };
      expect(detailResult.results.length).toBe(3);
      expect(detailResult.errors.length).toBe(2);
    });

    it('should handle batch with stop mode on first error', async () => {
      const processedIds: number[] = [];

      const executor: BatchToolExecutor = async (toolName: string, args: Record<string, unknown>) => {
        const id = args.id as number;
        processedIds.push(id);

        // Fail on ID 3
        if (id === 3) {
          return { success: false, error: 'Intentional failure' };
        }
        return { success: true, result: { id } };
      };

      // Items are processed in batches, so concurrency affects when stop happens
      const items = [
        { id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 },
        { id: 6 }, { id: 7 }, { id: 8 }, { id: 9 }, { id: 10 }
      ];

      const result = await executeBatch({
        tool_name: 'process',
        items,
        options: {
          on_error: 'stop',
          concurrency: 2,
          result_mode: 'summary',
          rateLimiter: createTestRateLimiter()
        }
      }, executor);

      expect(result.success).toBe(false);
      expect(result.stopped_early).toBe(true);
      // Should have stopped after processing batch containing ID 3
      expect(result.data.total).toBe(10);
      expect(result.data.failed).toBeGreaterThan(0);
    });

    it('should apply field projection in batch detail mode', async () => {
      const executor: BatchToolExecutor = async (toolName: string, args: Record<string, unknown>) => {
        return {
          success: true,
          result: {
            id: args.id,
            name: `Contact ${args.id}`,
            email: `contact${args.id}@test.com`,
            phone: '+1234567890',
            address: { city: 'NYC', country: 'USA' },
            metadata: { createdAt: '2025-01-01', updatedAt: '2025-01-02' }
          }
        };
      };

      const result = await executeBatch({
        tool_name: 'get_contact',
        items: [{ id: 1 }, { id: 2 }, { id: 3 }],
        options: {
          result_mode: 'detail',
          select_fields: ['id', 'name', 'email'],
          rateLimiter: createTestRateLimiter()
        }
      }, executor);

      expect(result.success).toBe(true);
      const detailResult = result.data as { results: Array<{ index: number; result: unknown }> };

      // Results should only contain projected fields
      for (const item of detailResult.results) {
        const data = item.result as Record<string, unknown>;
        expect(Object.keys(data).sort()).toEqual(['email', 'id', 'name']);
        expect(data.phone).toBeUndefined();
        expect(data.address).toBeUndefined();
      }
    });

    it('should return summary mode with counts only', async () => {
      const executor: BatchToolExecutor = async () => {
        return { success: true, result: { data: 'lots of data here' } };
      };

      const result = await executeBatch({
        tool_name: 'process',
        items: Array.from({ length: 10 }, (_, i) => ({ index: i })),
        options: {
          result_mode: 'summary',
          rateLimiter: createTestRateLimiter()
        }
      }, executor);

      expect(result.success).toBe(true);
      expect(result.data.total).toBe(10);
      expect(result.data.succeeded).toBe(10);
      expect(result.data.failed).toBe(0);
      // Summary mode should not include full results
      expect((result.data as any).results).toBeUndefined();
    });
  });

  describe('Combined Pipeline and Batch Patterns', () => {
    it('should chain pipeline step results through loops efficiently', async () => {
      // Simulates: Get all tags → For each tag, get contacts → Summarize
      const mockTags = ['vip', 'new', 'active'];
      const mockContactsByTag: Record<string, unknown[]> = {
        'vip': [{ id: 'c1' }, { id: 'c2' }],
        'new': [{ id: 'c3' }],
        'active': [{ id: 'c1' }, { id: 'c3' }, { id: 'c4' }]
      };

      const executor: ToolExecutor = async (toolName: string, args: Record<string, unknown>) => {
        if (toolName === 'get_tags') {
          return { success: true, result: mockTags };
        }
        if (toolName === 'get_contacts_by_tag') {
          const tag = args.tag as string;
          return { success: true, result: mockContactsByTag[tag] || [] };
        }
        if (toolName === 'summarize') {
          const allContacts = args.contacts as unknown[][];
          const uniqueIds = new Set<string>();
          for (const group of allContacts) {
            for (const contact of group) {
              uniqueIds.add((contact as { id: string }).id);
            }
          }
          return {
            success: true,
            result: {
              totalGroups: allContacts.length,
              uniqueContacts: uniqueIds.size
            }
          };
        }
        return { success: false, error: 'Unknown tool' };
      };

      const result = await executePipeline({
        steps: [
          { id: 'tags', tool_name: 'get_tags', args: {} },
          {
            id: 'contacts',
            tool_name: 'get_contacts_by_tag',
            args: { tag: '{{item}}' },
            loop: '{{tags}}'
          },
          {
            id: 'summary',
            tool_name: 'summarize',
            args: { contacts: '{{contacts}}' }
          }
        ],
        _rateLimiter: createTestRateLimiter()
      }, executor);

      expect(result.success).toBe(true);
      const summary = result.result as { totalGroups: number; uniqueContacts: number };
      expect(summary.totalGroups).toBe(3);
      expect(summary.uniqueContacts).toBe(4); // c1, c2, c3, c4 (unique)
    });
  });
});
