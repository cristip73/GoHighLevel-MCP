/**
 * Tool Registry for Progressive Disclosure
 *
 * Centralizes all 254 GHL tools and provides search/describe/execute capabilities.
 * This enables exposing only meta-tools while keeping full functionality available.
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { GHLApiClient } from '../clients/ghl-api-client.js';

// Import all tool classes
import { ContactTools } from '../tools/contact-tools.js';
import { ConversationTools } from '../tools/conversation-tools.js';
import { BlogTools } from '../tools/blog-tools.js';
import { OpportunityTools } from '../tools/opportunity-tools.js';
import { CalendarTools } from '../tools/calendar-tools.js';
import { EmailTools } from '../tools/email-tools.js';
import { LocationTools } from '../tools/location-tools.js';
import { EmailISVTools } from '../tools/email-isv-tools.js';
import { SocialMediaTools } from '../tools/social-media-tools.js';
import { MediaTools } from '../tools/media-tools.js';
import { ObjectTools } from '../tools/object-tools.js';
import { AssociationTools } from '../tools/association-tools.js';
import { CustomFieldV2Tools } from '../tools/custom-field-v2-tools.js';
import { WorkflowTools } from '../tools/workflow-tools.js';
import { SurveyTools } from '../tools/survey-tools.js';
import { StoreTools } from '../tools/store-tools.js';
import { ProductsTools } from '../tools/products-tools.js';
import { PaymentsTools } from '../tools/payments-tools.js';
import { InvoicesTools } from '../tools/invoices-tools.js';

import {
  ToolMetadata,
  SearchResult,
  DomainInfo,
  SearchOptions,
  ExecuteResult,
  DomainName,
  DOMAIN_NAMES
} from './types.js';

/**
 * Adapter to normalize different tool class interfaces
 */
interface ToolClassAdapter {
  getTools(): Tool[];
  execute(name: string, args: Record<string, unknown>): Promise<unknown>;
}

/**
 * Create an adapter for tool classes with different method names
 */
function createAdapter(toolInstance: any): ToolClassAdapter {
  return {
    getTools(): Tool[] {
      // Try different method names
      if (typeof toolInstance.getToolDefinitions === 'function') {
        return toolInstance.getToolDefinitions();
      }
      if (typeof toolInstance.getTools === 'function') {
        return toolInstance.getTools();
      }
      console.error('Tool class has no getToolDefinitions or getTools method');
      return [];
    },
    async execute(name: string, args: Record<string, unknown>): Promise<unknown> {
      // Try different method names based on tool class patterns
      if (typeof toolInstance.executeTool === 'function') {
        return toolInstance.executeTool(name, args);
      }
      if (typeof toolInstance.handleToolCall === 'function') {
        return toolInstance.handleToolCall(name, args);
      }
      if (typeof toolInstance.executeAssociationTool === 'function') {
        return toolInstance.executeAssociationTool(name, args);
      }
      if (typeof toolInstance.executeCustomFieldV2Tool === 'function') {
        return toolInstance.executeCustomFieldV2Tool(name, args);
      }
      if (typeof toolInstance.executeStoreTool === 'function') {
        return toolInstance.executeStoreTool(name, args);
      }
      if (typeof toolInstance.executeProductsTool === 'function') {
        return toolInstance.executeProductsTool(name, args);
      }
      if (typeof toolInstance.executeSurveyTool === 'function') {
        return toolInstance.executeSurveyTool(name, args);
      }
      if (typeof toolInstance.executeWorkflowTool === 'function') {
        return toolInstance.executeWorkflowTool(name, args);
      }
      throw new Error(`No execute method found for tool: ${name}`);
    }
  };
}

/**
 * Domain entry with adapter
 */
interface DomainEntry {
  description: string;
  adapter: ToolClassAdapter;
}

/**
 * Tool Registry - Central hub for all GHL tools
 */
export class ToolRegistry {
  private tools: Map<string, ToolMetadata> = new Map();
  private domains: Map<DomainName, DomainEntry> = new Map();
  private toolsByDomain: Map<DomainName, string[]> = new Map();
  private initialized = false;

  constructor(private ghlClient: GHLApiClient) {
    this.initializeDomains();
    this.buildIndex();
  }

  /**
   * Initialize all domain configurations with tool class instances
   */
  private initializeDomains(): void {
    // Define domain configs with their tool classes
    const domainConfigs: Array<{
      name: DomainName;
      description: string;
      createInstance: () => any;
    }> = [
      {
        name: 'contacts',
        description: 'Contact management, tasks, notes, tags, followers, campaigns',
        createInstance: () => new ContactTools(this.ghlClient)
      },
      {
        name: 'conversations',
        description: 'SMS, email, messaging, calls, recordings, transcriptions',
        createInstance: () => new ConversationTools(this.ghlClient)
      },
      {
        name: 'calendar',
        description: 'Appointments, scheduling, availability, calendar resources',
        createInstance: () => new CalendarTools(this.ghlClient)
      },
      {
        name: 'opportunities',
        description: 'Sales pipeline, deals, opportunity tracking',
        createInstance: () => new OpportunityTools(this.ghlClient)
      },
      {
        name: 'locations',
        description: 'Sub-accounts, settings, custom fields, templates',
        createInstance: () => new LocationTools(this.ghlClient)
      },
      {
        name: 'blog',
        description: 'Blog posts, authors, categories, SEO',
        createInstance: () => new BlogTools(this.ghlClient)
      },
      {
        name: 'social',
        description: 'Social media posts, accounts, scheduling',
        createInstance: () => new SocialMediaTools(this.ghlClient)
      },
      {
        name: 'email',
        description: 'Email campaigns, templates',
        createInstance: () => new EmailTools(this.ghlClient)
      },
      {
        name: 'media',
        description: 'File uploads, media library management',
        createInstance: () => new MediaTools(this.ghlClient)
      },
      {
        name: 'objects',
        description: 'Custom objects, records, schemas',
        createInstance: () => new ObjectTools(this.ghlClient)
      },
      {
        name: 'associations',
        description: 'Entity relationships, associations between objects',
        createInstance: () => new AssociationTools(this.ghlClient)
      },
      {
        name: 'customfields',
        description: 'Custom field management v2, folders',
        createInstance: () => new CustomFieldV2Tools(this.ghlClient)
      },
      {
        name: 'products',
        description: 'Product catalog, pricing, inventory',
        createInstance: () => new ProductsTools(this.ghlClient)
      },
      {
        name: 'store',
        description: 'Shipping zones, rates, carriers, store settings',
        createInstance: () => new StoreTools(this.ghlClient)
      },
      {
        name: 'payments',
        description: 'Orders, transactions, subscriptions, coupons',
        createInstance: () => new PaymentsTools(this.ghlClient)
      },
      {
        name: 'invoices',
        description: 'Invoices, estimates, billing, templates',
        createInstance: () => new InvoicesTools(this.ghlClient)
      },
      {
        name: 'surveys',
        description: 'Surveys, form submissions',
        createInstance: () => new SurveyTools(this.ghlClient)
      },
      {
        name: 'workflows',
        description: 'Automation workflows',
        createInstance: () => new WorkflowTools(this.ghlClient)
      },
      {
        name: 'verification',
        description: 'Email address verification',
        createInstance: () => new EmailISVTools(this.ghlClient)
      }
    ];

    // Instantiate all tool classes with adapters
    for (const config of domainConfigs) {
      try {
        const instance = config.createInstance();
        const adapter = createAdapter(instance);
        this.domains.set(config.name, {
          description: config.description,
          adapter
        });
        this.toolsByDomain.set(config.name, []);
      } catch (error) {
        console.error(`[ToolRegistry] Failed to initialize domain ${config.name}:`, error);
      }
    }
  }

  /**
   * Build the searchable tool index from all domains
   */
  private buildIndex(): void {
    for (const [domainName, domainEntry] of this.domains) {
      try {
        const toolDefs = domainEntry.adapter.getTools();

        for (const tool of toolDefs) {
          const metadata = this.createMetadata(tool, domainName);
          this.tools.set(tool.name, metadata);
          this.toolsByDomain.get(domainName)?.push(tool.name);
        }
      } catch (error) {
        console.error(`[ToolRegistry] Failed to index domain ${domainName}:`, error);
      }
    }

    this.initialized = true;
    console.error(`[ToolRegistry] Indexed ${this.tools.size} tools across ${this.domains.size} domains`);
  }

  /**
   * Create searchable metadata from a tool definition
   */
  private createMetadata(tool: Tool, domain: DomainName): ToolMetadata {
    const description = tool.description || '';
    const schema = tool.inputSchema as Record<string, unknown>;
    const requiredParams = (schema.required as string[]) || [];

    // Create a short summary (max 100 chars)
    const summary = description.length > 100
      ? description.substring(0, 97) + '...'
      : description;

    // Generate search tags from name and description
    const tags = this.generateTags(tool.name, description);

    return {
      name: tool.name,
      domain,
      summary,
      description,
      inputSchema: schema,
      requiredParams,
      tags,
      originalTool: tool
    };
  }

  /**
   * Generate search tags from tool name and description
   */
  private generateTags(name: string, description: string): string[] {
    const tags = new Set<string>();

    // Add name parts (split by underscore)
    name.split('_').forEach(part => {
      if (part.length > 2) tags.add(part.toLowerCase());
    });

    // Add significant words from description
    const stopWords = new Set(['a', 'an', 'the', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those', 'and', 'or', 'but', 'if', 'then', 'else', 'when', 'where', 'why', 'how', 'all', 'each', 'every', 'both', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very']);

    description.toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.has(word))
      .forEach(word => tags.add(word));

    return Array.from(tags);
  }

  /**
   * Search tools by query and optional filters
   */
  search(query: string, options: SearchOptions = {}): SearchResult[] {
    const { domain, limit = 10, minRelevance = 0.1 } = options;
    const queryLower = query.toLowerCase();
    const queryTerms = queryLower.split(/\s+/).filter(t => t.length > 1);

    const results: SearchResult[] = [];

    for (const [name, metadata] of this.tools) {
      // Filter by domain if specified
      if (domain && metadata.domain !== domain) continue;

      // Calculate relevance score
      const relevance = this.calculateRelevance(metadata, queryTerms, queryLower);

      if (relevance >= minRelevance) {
        results.push({
          name: metadata.name,
          domain: metadata.domain,
          summary: metadata.summary,
          requiredParams: metadata.requiredParams,
          relevance
        });
      }
    }

    // Sort by relevance (highest first) and limit
    return results
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, limit);
  }

  /**
   * Calculate search relevance score for a tool
   */
  private calculateRelevance(metadata: ToolMetadata, queryTerms: string[], fullQuery: string): number {
    let score = 0;

    // Exact name match is highest
    if (metadata.name.toLowerCase() === fullQuery.replace(/\s+/g, '_')) {
      return 1.0;
    }

    // Name contains query
    if (metadata.name.toLowerCase().includes(fullQuery.replace(/\s+/g, '_'))) {
      score += 0.5;
    }

    // Check each query term
    for (const term of queryTerms) {
      // Term in name
      if (metadata.name.toLowerCase().includes(term)) {
        score += 0.3;
      }

      // Term in tags
      if (metadata.tags.includes(term)) {
        score += 0.2;
      }

      // Term in description
      if (metadata.description.toLowerCase().includes(term)) {
        score += 0.1;
      }

      // Term in domain
      if (metadata.domain.includes(term)) {
        score += 0.15;
      }
    }

    // Normalize score to 0-1 range
    return Math.min(1, score);
  }

  /**
   * Get full metadata for specific tools (for describe_tools)
   */
  describe(toolNames: string[]): ToolMetadata[] {
    const results: ToolMetadata[] = [];

    for (const name of toolNames) {
      const metadata = this.tools.get(name);
      if (metadata) {
        results.push(metadata);
      }
    }

    return results;
  }

  /**
   * Get original MCP Tool definitions for specific tools
   */
  getToolDefinitions(toolNames: string[]): Tool[] {
    return toolNames
      .map(name => this.tools.get(name)?.originalTool)
      .filter((tool): tool is Tool => tool !== undefined);
  }

  /**
   * Execute a tool by name with validation
   */
  async execute(toolName: string, args: Record<string, unknown>): Promise<ExecuteResult> {
    const metadata = this.tools.get(toolName);

    if (!metadata) {
      return {
        success: false,
        error: `Unknown tool: ${toolName}`,
        validationErrors: [`Tool "${toolName}" not found. Use search_tools to find available tools.`]
      };
    }

    // Basic required params validation
    const missingParams: string[] = [];
    for (const required of metadata.requiredParams) {
      if (args[required] === undefined || args[required] === null) {
        missingParams.push(required);
      }
    }

    if (missingParams.length > 0) {
      return {
        success: false,
        error: 'Missing required parameters',
        validationErrors: missingParams.map(p => `Missing required parameter: ${p}`)
      };
    }

    // Find the domain that owns this tool
    const domainEntry = this.domains.get(metadata.domain as DomainName);
    if (!domainEntry) {
      return {
        success: false,
        error: `Domain not found for tool: ${toolName}`
      };
    }

    // Execute the tool via adapter
    try {
      const result = await domainEntry.adapter.execute(toolName, args);
      return {
        success: true,
        result
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * List all domains with tool counts
   */
  listDomains(): DomainInfo[] {
    const results: DomainInfo[] = [];

    for (const [domainName, domainEntry] of this.domains) {
      const toolNames = this.toolsByDomain.get(domainName) || [];

      results.push({
        name: domainName,
        toolCount: toolNames.length,
        description: domainEntry.description,
        exampleTools: toolNames.slice(0, 3) // First 3 tools as examples
      });
    }

    // Sort by tool count descending
    return results.sort((a, b) => b.toolCount - a.toolCount);
  }

  /**
   * Get a specific tool's metadata
   */
  getTool(name: string): ToolMetadata | undefined {
    return this.tools.get(name);
  }

  /**
   * Check if a tool exists
   */
  hasTool(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * Get all tool names in a domain
   */
  getToolsInDomain(domain: DomainName): string[] {
    return this.toolsByDomain.get(domain) || [];
  }

  /**
   * Get total tool count
   */
  getToolCount(): number {
    return this.tools.size;
  }

  /**
   * Get all tools (for debug/fallback)
   */
  getAllTools(): Tool[] {
    return Array.from(this.tools.values()).map(m => m.originalTool);
  }

  /**
   * Validate domain name
   */
  isValidDomain(domain: string): domain is DomainName {
    return DOMAIN_NAMES.includes(domain as DomainName);
  }
}
