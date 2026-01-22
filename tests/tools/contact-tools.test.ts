/**
 * Unit Tests for Contact Tools
 * Tests contact management MCP tool definitions
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { ContactTools } from '../../src/tools/contact-tools.js';
import { MockGHLApiClient } from '../mocks/ghl-api-client.mock.js';

describe('ContactTools', () => {
  let contactTools: ContactTools;
  let mockGhlClient: MockGHLApiClient;

  beforeEach(() => {
    mockGhlClient = new MockGHLApiClient();
    contactTools = new ContactTools(mockGhlClient as any);
  });

  describe('getToolDefinitions', () => {
    it('should return contact tool definitions', () => {
      const tools = contactTools.getToolDefinitions();
      expect(tools.length).toBeGreaterThan(0);

      // Verify core tools exist
      const toolNames = tools.map(tool => tool.name);
      expect(toolNames).toContain('create_contact');
      expect(toolNames).toContain('search_contacts');
      expect(toolNames).toContain('get_contact');
      expect(toolNames).toContain('update_contact');
      expect(toolNames).toContain('delete_contact');
    });

    it('should have proper schema definitions for all tools', () => {
      const tools = contactTools.getToolDefinitions();

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
        contactTools.executeTool('unknown_tool', {})
      ).rejects.toThrow('Unknown tool: unknown_tool');
    });
  });

  describe('input validation schemas', () => {
    it('should have email property in create_contact schema', () => {
      const tools = contactTools.getToolDefinitions();
      const createContactTool = tools.find(tool => tool.name === 'create_contact');

      expect(createContactTool?.inputSchema.properties.email).toBeDefined();
    });

    it('should require email for create_contact', () => {
      const tools = contactTools.getToolDefinitions();
      const createContactTool = tools.find(tool => tool.name === 'create_contact');

      expect(createContactTool?.inputSchema.required).toContain('email');
    });

    it('should require contactId for get_contact', () => {
      const tools = contactTools.getToolDefinitions();
      const getContactTool = tools.find(tool => tool.name === 'get_contact');

      expect(getContactTool?.inputSchema.required).toContain('contactId');
    });
  });
});
