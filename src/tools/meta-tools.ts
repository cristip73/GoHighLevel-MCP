/**
 * Meta Tools for Progressive Disclosure
 *
 * These are the only tools exposed to the client. They provide:
 * - search_tools: Find tools by keyword/domain
 * - describe_tools: Get full schema for specific tools
 * - execute_tool: Run any tool by name
 * - list_domains: Overview of tool categories
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { ToolRegistry } from '../registry/tool-registry.js';
import { DOMAIN_NAMES } from '../registry/types.js';

/**
 * Meta Tools class - exposes discovery and execution tools
 */
export class MetaTools {
  constructor(private registry: ToolRegistry) {}

  /**
   * Get MCP tool definitions for all meta-tools
   */
  getToolDefinitions(): Tool[] {
    return [
      {
        name: 'search_tools',
        description: 'Search available GoHighLevel tools by keyword or domain. Returns tool summaries. Use describe_tools to get full schema before using execute_tool.',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search keywords (e.g., "create contact", "send sms", "calendar")'
            },
            domain: {
              type: 'string',
              enum: DOMAIN_NAMES,
              description: 'Optional: Filter by domain (contacts, conversations, calendar, etc.)'
            },
            limit: {
              type: 'number',
              description: 'Maximum results to return (default: 8, max: 20)',
              default: 8,
              maximum: 20
            }
          },
          required: ['query']
        }
      },
      {
        name: 'describe_tools',
        description: 'Get full JSON schema and details for specific tools. Use this before execute_tool to understand required parameters.',
        inputSchema: {
          type: 'object',
          properties: {
            tool_names: {
              type: 'array',
              items: { type: 'string' },
              description: 'Tool names to describe (max 5)',
              maxItems: 5
            }
          },
          required: ['tool_names']
        }
      },
      {
        name: 'execute_tool',
        description: 'Execute a GoHighLevel tool by name. Arguments are validated against the tool schema. Use describe_tools first to see required parameters.',
        inputSchema: {
          type: 'object',
          properties: {
            tool_name: {
              type: 'string',
              description: 'Name of the tool to execute'
            },
            args: {
              type: 'object',
              description: 'Arguments to pass to the tool (must match tool schema)',
              additionalProperties: true
            }
          },
          required: ['tool_name', 'args']
        }
      },
      {
        name: 'list_domains',
        description: 'List all available tool domains/categories with tool counts. Use this to discover what capabilities are available.',
        inputSchema: {
          type: 'object',
          properties: {},
          required: []
        }
      }
    ];
  }

  /**
   * Execute a meta-tool by name
   */
  async executeTool(name: string, args: Record<string, unknown>): Promise<unknown> {
    switch (name) {
      case 'search_tools':
        return this.searchTools(args);

      case 'describe_tools':
        return this.describeTools(args);

      case 'execute_tool':
        return this.executeTool_(args);

      case 'list_domains':
        return this.listDomains();

      default:
        throw new Error(`Unknown meta-tool: ${name}`);
    }
  }

  /**
   * Search tools by query
   */
  private searchTools(args: Record<string, unknown>): unknown {
    const query = args.query as string;
    const domain = args.domain as string | undefined;
    const limit = Math.min((args.limit as number) || 8, 20);

    if (!query || query.trim().length === 0) {
      return {
        error: 'Query is required',
        hint: 'Provide search keywords like "create contact" or "send email"'
      };
    }

    // Validate domain if provided
    if (domain && !this.registry.isValidDomain(domain)) {
      return {
        error: `Invalid domain: ${domain}`,
        validDomains: DOMAIN_NAMES,
        hint: 'Use list_domains to see available domains'
      };
    }

    const results = this.registry.search(query, {
      domain: domain as any,
      limit
    });

    return {
      query,
      domain: domain || 'all',
      resultCount: results.length,
      totalTools: this.registry.getToolCount(),
      results: results.map(r => ({
        name: r.name,
        domain: r.domain,
        summary: r.summary,
        requiredParams: r.requiredParams.length > 0 ? r.requiredParams : 'none',
        relevance: Math.round(r.relevance * 100) + '%'
      })),
      hint: results.length > 0
        ? `Use describe_tools(['${results[0].name}']) to see full schema`
        : 'Try different keywords or use list_domains to see categories'
    };
  }

  /**
   * Describe tools with full schema
   */
  private describeTools(args: Record<string, unknown>): unknown {
    const toolNames = args.tool_names as string[];

    if (!toolNames || !Array.isArray(toolNames) || toolNames.length === 0) {
      return {
        error: 'tool_names array is required',
        hint: 'Provide an array of tool names like ["create_contact", "send_sms"]'
      };
    }

    if (toolNames.length > 5) {
      return {
        error: 'Maximum 5 tools can be described at once',
        hint: 'Request fewer tools or make multiple describe_tools calls'
      };
    }

    const metadata = this.registry.describe(toolNames);
    const notFound = toolNames.filter(name => !this.registry.hasTool(name));

    const result: Record<string, unknown> = {
      found: metadata.length,
      requested: toolNames.length
    };

    if (notFound.length > 0) {
      result.notFound = notFound;
      result.hint = 'Use search_tools to find correct tool names';
    }

    result.tools = metadata.map(m => ({
      name: m.name,
      domain: m.domain,
      description: m.description,
      inputSchema: m.inputSchema,
      requiredParams: m.requiredParams,
      usage: `execute_tool({ tool_name: "${m.name}", args: { ${m.requiredParams.map(p => `${p}: "..."`).join(', ')} } })`
    }));

    return result;
  }

  /**
   * Execute a tool via the registry
   */
  private async executeTool_(args: Record<string, unknown>): Promise<unknown> {
    const toolName = args.tool_name as string;
    const toolArgs = (args.args as Record<string, unknown>) || {};

    if (!toolName) {
      return {
        success: false,
        error: 'tool_name is required',
        hint: 'Use search_tools to find available tools'
      };
    }

    const result = await this.registry.execute(toolName, toolArgs);

    if (!result.success) {
      return {
        success: false,
        error: result.error,
        validationErrors: result.validationErrors,
        hint: result.validationErrors
          ? `Use describe_tools(['${toolName}']) to see required parameters`
          : 'Check the error message and try again'
      };
    }

    return {
      success: true,
      tool: toolName,
      result: result.result
    };
  }

  /**
   * List all domains with their tool counts
   */
  private listDomains(): unknown {
    const domains = this.registry.listDomains();

    return {
      totalDomains: domains.length,
      totalTools: this.registry.getToolCount(),
      domains: domains.map(d => ({
        name: d.name,
        toolCount: d.toolCount,
        description: d.description,
        examples: d.exampleTools
      })),
      hint: 'Use search_tools with a domain filter to explore specific categories'
    };
  }

  /**
   * Check if a tool name is a meta-tool
   */
  isMetaTool(name: string): boolean {
    return ['search_tools', 'describe_tools', 'execute_tool', 'list_domains'].includes(name);
  }
}
