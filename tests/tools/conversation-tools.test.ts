/**
 * Unit Tests for Conversation Tools
 * Tests messaging and conversation MCP tool definitions
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { ConversationTools } from '../../src/tools/conversation-tools.js';
import { MockGHLApiClient } from '../mocks/ghl-api-client.mock.js';

describe('ConversationTools', () => {
  let conversationTools: ConversationTools;
  let mockGhlClient: MockGHLApiClient;

  beforeEach(() => {
    mockGhlClient = new MockGHLApiClient();
    conversationTools = new ConversationTools(mockGhlClient as any);
  });

  describe('getToolDefinitions', () => {
    it('should return conversation tool definitions', () => {
      const tools = conversationTools.getToolDefinitions();
      expect(tools.length).toBeGreaterThan(0);

      // Verify core tools exist
      const toolNames = tools.map(tool => tool.name);
      expect(toolNames).toContain('send_sms');
      expect(toolNames).toContain('send_email');
      expect(toolNames).toContain('search_conversations');
      expect(toolNames).toContain('get_conversation');
    });

    it('should have proper schema definitions for all tools', () => {
      const tools = conversationTools.getToolDefinitions();

      tools.forEach(tool => {
        expect(tool.name).toBeDefined();
        expect(tool.description).toBeDefined();
        expect(tool.inputSchema).toBeDefined();
        expect(tool.inputSchema.type).toBe('object');
        expect(tool.inputSchema.properties).toBeDefined();
      });
    });
  });

  describe('executeTool routing', () => {
    it('should throw error for unknown tool', async () => {
      await expect(
        conversationTools.executeTool('unknown_tool', {})
      ).rejects.toThrow('Unknown tool: unknown_tool');
    });
  });

  describe('input validation schemas', () => {
    it('should validate SMS message length in schema', () => {
      const tools = conversationTools.getToolDefinitions();
      const smsTool = tools.find(tool => tool.name === 'send_sms');

      expect(smsTool?.inputSchema.properties.message.maxLength).toBe(1600);
    });

    it('should require contactId and message for send_sms', () => {
      const tools = conversationTools.getToolDefinitions();
      const smsTool = tools.find(tool => tool.name === 'send_sms');

      expect(smsTool?.inputSchema.required).toContain('contactId');
      expect(smsTool?.inputSchema.required).toContain('message');
    });

    it('should require contactId and subject for send_email', () => {
      const tools = conversationTools.getToolDefinitions();
      const emailTool = tools.find(tool => tool.name === 'send_email');

      expect(emailTool?.inputSchema.required).toContain('contactId');
      expect(emailTool?.inputSchema.required).toContain('subject');
    });
  });
});
