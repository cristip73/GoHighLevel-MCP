/**
 * GoHighLevel MCP Server - Progressive Disclosure Edition
 *
 * Exposes only 5 tools instead of 254 to reduce token usage by ~97%:
 * - search_tools: Find tools by keyword/domain
 * - describe_tools: Get full schema for specific tools
 * - execute_tool: Run any tool by name
 * - list_domains: Overview of tool categories
 * - search_contacts: Direct access to most-used tool
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError
} from '@modelcontextprotocol/sdk/types.js';
import * as dotenv from 'dotenv';

import { GHLApiClient } from './clients/ghl-api-client.js';
import { GHLConfig } from './types/ghl-types.js';
import { ToolRegistry } from './registry/tool-registry.js';
import { MetaTools } from './tools/meta-tools.js';

// Load environment variables
dotenv.config();

/**
 * Main MCP Server class - Progressive Disclosure Edition
 */
class GHLMCPServer {
  private server: Server;
  private ghlClient: GHLApiClient;
  private registry: ToolRegistry;
  private metaTools: MetaTools;

  constructor() {
    // Initialize MCP server with capabilities
    this.server = new Server(
      {
        name: 'ghl-mcp-server',
        version: '2.0.0', // Progressive Disclosure version
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Initialize GHL API client
    this.ghlClient = this.initializeGHLClient();

    // Initialize tool registry (indexes all 254 tools internally)
    this.registry = new ToolRegistry(this.ghlClient);

    // Initialize meta-tools (exposes only 4 discovery tools)
    this.metaTools = new MetaTools(this.registry);

    // Setup MCP handlers
    this.setupHandlers();
  }

  /**
   * Initialize GoHighLevel API client with configuration
   */
  private initializeGHLClient(): GHLApiClient {
    const config: GHLConfig = {
      accessToken: process.env.GHL_API_KEY || '',
      baseUrl: process.env.GHL_BASE_URL || 'https://services.leadconnectorhq.com',
      version: '2021-07-28',
      locationId: process.env.GHL_LOCATION_ID || ''
    };

    if (!config.accessToken) {
      throw new Error('GHL_API_KEY environment variable is required');
    }

    if (!config.locationId) {
      throw new Error('GHL_LOCATION_ID environment variable is required');
    }

    process.stderr.write('[GHL MCP] Initializing GHL API client...\n');
    process.stderr.write(`[GHL MCP] Base URL: ${config.baseUrl}\n`);
    process.stderr.write(`[GHL MCP] Location ID: ${config.locationId}\n`);

    return new GHLApiClient(config);
  }

  /**
   * Setup MCP request handlers
   */
  private setupHandlers(): void {
    // Handle list tools requests - returns ONLY meta-tools + search_contacts
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      process.stderr.write('[GHL MCP] Listing tools (progressive disclosure mode)...\n');

      try {
        // Get meta-tools (4 tools)
        const metaToolDefs = this.metaTools.getToolDefinitions();

        // Get search_contacts directly for convenience (most-used tool)
        const searchContactsTool = this.registry.getToolDefinitions(['search_contacts']);

        const exposedTools = [...metaToolDefs, ...searchContactsTool];

        process.stderr.write(`[GHL MCP] Exposing ${exposedTools.length} tools (${this.registry.getToolCount()} available via execute_tool)\n`);
        process.stderr.write('[GHL MCP] Exposed: search_tools, describe_tools, execute_tool, list_domains, search_contacts\n');

        return {
          tools: exposedTools
        };
      } catch (error) {
        console.error('[GHL MCP] Error listing tools:', error);
        throw new McpError(
          ErrorCode.InternalError,
          `Failed to list tools: ${error}`
        );
      }
    });

    // Handle tool execution requests
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      process.stderr.write(`[GHL MCP] Executing tool: ${name}\n`);

      try {
        let result: unknown;

        // Route to meta-tools or direct tools
        if (this.metaTools.isMetaTool(name)) {
          // Meta-tool execution (search_tools, describe_tools, execute_tool, list_domains)
          result = await this.metaTools.executeTool(name, (args as Record<string, unknown>) || {});
        } else if (name === 'search_contacts') {
          // Direct execution of search_contacts (high-use tool)
          const executeResult = await this.registry.execute(name, (args as Record<string, unknown>) || {});
          if (!executeResult.success) {
            throw new Error(executeResult.error || 'Tool execution failed');
          }
          result = executeResult.result;
        } else {
          // Unknown tool - suggest using search_tools
          throw new Error(
            `Unknown tool: ${name}. Use search_tools to find available tools, ` +
            `then describe_tools to get the schema, and execute_tool to run them.`
          );
        }

        process.stderr.write(`[GHL MCP] Tool ${name} executed successfully\n`);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      } catch (error) {
        console.error(`[GHL MCP] Error executing tool ${name}:`, error);

        const errorCode = error instanceof Error && error.message.includes('Unknown tool')
          ? ErrorCode.MethodNotFound
          : ErrorCode.InternalError;

        throw new McpError(
          errorCode,
          `Tool execution failed: ${error}`
        );
      }
    });

    process.stderr.write('[GHL MCP] Request handlers setup complete\n');
  }

  /**
   * Test GHL API connection
   */
  private async testGHLConnection(): Promise<void> {
    try {
      process.stderr.write('[GHL MCP] Testing GHL API connection...\n');

      const result = await this.ghlClient.testConnection();

      process.stderr.write('[GHL MCP] ✅ GHL API connection successful\n');
      process.stderr.write(`[GHL MCP] Connected to location: ${result.data?.locationId}\n`);
    } catch (error) {
      console.error('[GHL MCP] ❌ GHL API connection failed:', error);
      throw new Error(`Failed to connect to GHL API: ${error}`);
    }
  }

  /**
   * Initialize and start the MCP server
   */
  async start(): Promise<void> {
    process.stderr.write('🚀 Starting GoHighLevel MCP Server (Progressive Disclosure)...\n');
    process.stderr.write('================================================================\n');

    try {
      // Test GHL API connection
      await this.testGHLConnection();

      // Create transport
      const transport = new StdioServerTransport();

      // Connect server to transport
      await this.server.connect(transport);

      process.stderr.write('✅ GoHighLevel MCP Server started successfully!\n');
      process.stderr.write('🔗 Ready to handle Claude Desktop requests\n');
      process.stderr.write('================================================================\n');
      process.stderr.write('\n');
      process.stderr.write('📊 PROGRESSIVE DISCLOSURE MODE\n');
      process.stderr.write(`   Total tools available: ${this.registry.getToolCount()}\n`);
      process.stderr.write('   Tools exposed: 5 (97% token reduction)\n');
      process.stderr.write('\n');
      process.stderr.write('🔍 EXPOSED TOOLS:\n');
      process.stderr.write('   • search_tools     - Find tools by keyword/domain\n');
      process.stderr.write('   • describe_tools   - Get full schema for specific tools\n');
      process.stderr.write('   • execute_tool     - Run any tool by name\n');
      process.stderr.write('   • list_domains     - Overview of tool categories\n');
      process.stderr.write('   • search_contacts  - Direct access (most-used)\n');
      process.stderr.write('\n');
      process.stderr.write('📚 HOW TO USE:\n');
      process.stderr.write('   1. list_domains() - See available categories\n');
      process.stderr.write('   2. search_tools("create contact") - Find relevant tools\n');
      process.stderr.write('   3. describe_tools(["create_contact"]) - Get full schema\n');
      process.stderr.write('   4. execute_tool("create_contact", {...}) - Run the tool\n');
      process.stderr.write('================================================================\n');

    } catch (error) {
      console.error('❌ Failed to start GHL MCP Server:', error);
      process.exit(1);
    }
  }
}

/**
 * Handle graceful shutdown
 */
function setupGracefulShutdown(): void {
  const shutdown = (signal: string) => {
    process.stderr.write(`\n[GHL MCP] Received ${signal}, shutting down gracefully...\n`);
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  try {
    setupGracefulShutdown();

    const server = new GHLMCPServer();
    await server.start();

  } catch (error) {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  }
}

// Start the server
main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
