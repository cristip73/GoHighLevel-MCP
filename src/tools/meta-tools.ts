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
import { DOMAIN_NAMES, ExecuteOptions, ReturnMode } from '../registry/types.js';
import { applyProjection, applyFilter, applyReturnMode } from '../execution/index.js';

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
        description: 'Execute a GoHighLevel tool by name with optional result transformation. Use options to reduce context pollution by filtering, projecting, or summarizing results.',
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
            },
            options: {
              type: 'object',
              description: 'Optional result transformation options to reduce context size',
              properties: {
                select_fields: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Select specific fields from results. Supports dot notation (e.g., "contact.email", "tags[0]")'
                },
                limit: {
                  type: 'number',
                  description: 'Limit array results to specified count (server-side)'
                },
                filter: {
                  type: 'string',
                  description: 'Filter expression: "field OPERATOR value". Operators: =, !=, >, <, CONTAINS, STARTS_WITH, IS_NULL, IS_NOT_NULL'
                },
                return_mode: {
                  type: 'string',
                  enum: ['inline', 'summary', 'file'],
                  description: 'Return mode: inline (default, full data), summary (count + 3 samples), file (write to temp file)'
                }
              }
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
   * Execute a tool via the registry with optional result transformation
   */
  private async executeTool_(args: Record<string, unknown>): Promise<unknown> {
    const toolName = args.tool_name as string;
    const toolArgs = (args.args as Record<string, unknown>) || {};
    const options = (args.options as ExecuteOptions) || {};

    if (!toolName) {
      return {
        success: false,
        error: 'tool_name is required',
        hint: 'Use search_tools to find available tools'
      };
    }

    // Execute the underlying tool
    const executeResult = await this.registry.execute(toolName, toolArgs);

    if (!executeResult.success) {
      return {
        success: false,
        error: executeResult.error,
        validationErrors: executeResult.validationErrors,
        hint: executeResult.validationErrors
          ? `Use describe_tools(['${toolName}']) to see required parameters`
          : 'Check the error message and try again'
      };
    }

    // Apply transformations in order: filter → limit → project → return_mode
    let result = executeResult.result;
    const transformations: string[] = [];

    // 1. Apply filter
    if (options.filter) {
      const filterResult = applyFilter(result, options.filter);
      if (filterResult.error) {
        return {
          success: false,
          error: filterResult.error,
          hint: 'Filter format: "field OPERATOR value". Operators: =, !=, >, <, CONTAINS, STARTS_WITH, IS_NULL, IS_NOT_NULL'
        };
      }
      result = filterResult.result;
      transformations.push(`filtered by "${options.filter}"`);
    }

    // 2. Apply limit (only for arrays, must be non-negative integer)
    if (options.limit !== undefined && Array.isArray(result)) {
      const limit = Math.max(0, Math.floor(options.limit));
      const originalLength = result.length;
      result = result.slice(0, limit);
      if (originalLength > limit) {
        transformations.push(`limited to ${limit} of ${originalLength}`);
      }
    }

    // 3. Apply field projection
    if (options.select_fields && options.select_fields.length > 0) {
      result = applyProjection(result, options.select_fields);
      transformations.push(`projected fields: ${options.select_fields.join(', ')}`);
    }

    // 4. Apply return mode
    const returnMode = options.return_mode as ReturnMode | undefined;
    if (returnMode && returnMode !== 'inline') {
      result = applyReturnMode(result, returnMode, toolName);
      transformations.push(`return_mode: ${returnMode}`);
    }

    // Build response
    const response: Record<string, unknown> = {
      success: true,
      tool: toolName,
      result
    };

    // Add transformation info if any were applied
    if (transformations.length > 0) {
      response.transformations = transformations;
    }

    return response;
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
