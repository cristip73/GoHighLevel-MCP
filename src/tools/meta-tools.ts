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
import { executePipeline, PipelineRequest } from '../execution/pipeline-executor.js';
import { executeBatch, BatchRequest } from '../execution/batch-executor.js';

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
      },
      {
        name: 'execute_pipeline',
        description: 'Execute a multi-step workflow server-side, returning only the final result. Steps execute sequentially with variable passing between them. Use this to reduce context pollution by executing complex workflows in a single tool call.',
        inputSchema: {
          type: 'object',
          properties: {
            steps: {
              type: 'array',
              description: 'Array of steps to execute in order',
              items: {
                type: 'object',
                properties: {
                  id: {
                    type: 'string',
                    description: 'Unique identifier for this step (used in variable references like {{step_id.field}})'
                  },
                  tool_name: {
                    type: 'string',
                    description: 'Name of the tool to execute'
                  },
                  args: {
                    type: 'object',
                    description: 'Arguments for the tool. Use {{step_id.field}} syntax to reference results from previous steps',
                    additionalProperties: true
                  },
                  delay_ms: {
                    type: 'number',
                    description: 'Optional delay in milliseconds before executing this step (max 30000)',
                    minimum: 0,
                    maximum: 30000
                  }
                },
                required: ['id', 'tool_name', 'args']
              },
              minItems: 1
            },
            return: {
              type: 'object',
              description: 'Optional template specifying which fields to include in the final response. Keys are step IDs, values are arrays of field paths to extract. If not provided, returns the last step\'s full result.',
              additionalProperties: {
                type: 'array',
                items: { type: 'string' }
              }
            },
            timeout_ms: {
              type: 'number',
              description: 'Optional timeout in milliseconds for the entire pipeline (default: 120000ms = 2 min, max: 300000ms = 5 min)',
              minimum: 0,
              maximum: 300000
            }
          },
          required: ['steps']
        }
      },
      {
        name: 'execute_batch',
        description: 'Execute a single tool for multiple items with rate limiting and parallel processing. Use this for bulk operations like updating many contacts, sending multiple messages, or batch data processing.',
        inputSchema: {
          type: 'object',
          properties: {
            tool_name: {
              type: 'string',
              description: 'Name of the tool to execute for each item'
            },
            items: {
              type: 'array',
              description: 'Array of argument objects, one per item to process (max 100)',
              items: {
                type: 'object',
                additionalProperties: true
              },
              minItems: 1,
              maxItems: 100
            },
            options: {
              type: 'object',
              description: 'Optional batch execution options',
              properties: {
                concurrency: {
                  type: 'number',
                  description: 'Maximum parallel executions (default: 5, max: 10)',
                  default: 5,
                  minimum: 1,
                  maximum: 10
                },
                on_error: {
                  type: 'string',
                  enum: ['continue', 'stop'],
                  description: 'Behavior on error: "continue" processes remaining items (default), "stop" halts execution'
                },
                result_mode: {
                  type: 'string',
                  enum: ['summary', 'detail'],
                  description: 'Return mode: "summary" returns counts only (default), "detail" returns all results'
                },
                select_fields: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Field projection for detail mode (reduces result size)'
                },
                max_retries: {
                  type: 'number',
                  description: 'Maximum retries per failed item (default: 0, max: 3)',
                  default: 0,
                  minimum: 0,
                  maximum: 3
                }
              }
            }
          },
          required: ['tool_name', 'items']
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

      case 'execute_pipeline':
        return this.executePipeline_(args);

      case 'execute_batch':
        return this.executeBatch_(args);

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
   * Execute a multi-step pipeline server-side
   */
  private async executePipeline_(args: Record<string, unknown>): Promise<unknown> {
    const request = args as unknown as PipelineRequest;

    if (!request.steps || !Array.isArray(request.steps)) {
      return {
        success: false,
        error: 'Pipeline must have a "steps" array',
        hint: 'Each step needs: id, tool_name, and args'
      };
    }

    // Create executor function that uses the registry
    const executor = async (toolName: string, toolArgs: Record<string, unknown>) => {
      return this.registry.execute(toolName, toolArgs);
    };

    // Execute the pipeline
    const result = await executePipeline(request, executor);

    // Add hints for common errors
    if (!result.success && result.error) {
      const response: Record<string, unknown> = { ...result };

      if (result.error.step_id === '_validation') {
        response.hint = 'Check step IDs and variable references. Variables can only reference previous steps.';
      } else {
        response.hint = `Use describe_tools(['${request.steps.find(s => s.id === result.error?.step_id)?.tool_name}']) to see required parameters`;
      }

      return response;
    }

    return result;
  }

  /**
   * Execute a batch of tool calls server-side
   */
  private async executeBatch_(args: Record<string, unknown>): Promise<unknown> {
    const request = args as unknown as BatchRequest;

    if (!request.tool_name) {
      return {
        success: false,
        error: 'tool_name is required',
        hint: 'Specify the tool to execute for each item'
      };
    }

    if (!request.items || !Array.isArray(request.items)) {
      return {
        success: false,
        error: 'items array is required',
        hint: 'Provide an array of argument objects, one per item'
      };
    }

    // Create executor function that uses the registry
    const executor = async (toolName: string, toolArgs: Record<string, unknown>) => {
      return this.registry.execute(toolName, toolArgs);
    };

    // Execute the batch
    const result = await executeBatch(request, executor);

    // Add hints for common errors
    if (!result.success && result.data.errors.length > 0) {
      const response: Record<string, unknown> = { ...result };
      response.hint = `Use describe_tools(['${request.tool_name}']) to see required parameters`;
      return response;
    }

    return result;
  }

  /**
   * Check if a tool name is a meta-tool
   */
  isMetaTool(name: string): boolean {
    return ['search_tools', 'describe_tools', 'execute_tool', 'list_domains', 'execute_pipeline', 'execute_batch'].includes(name);
  }
}
