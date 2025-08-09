/**
 * GoHighLevel MCP HTTP Server
 * HTTP version for ChatGPT web integration
 */

import express from 'express';
import cors from 'cors';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { 
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError 
} from '@modelcontextprotocol/sdk/types.js';
import * as dotenv from 'dotenv';
import { authGuard } from './middleware/auth';

import { GHLApiClient } from './clients/ghl-api-client';
import { ContactTools } from './tools/contact-tools';
import { ConversationTools } from './tools/conversation-tools';
import { BlogTools } from './tools/blog-tools';
import { OpportunityTools } from './tools/opportunity-tools';
import { CalendarTools } from './tools/calendar-tools';
import { EmailTools } from './tools/email-tools';
import { LocationTools } from './tools/location-tools';
import { EmailISVTools } from './tools/email-isv-tools';
import { SocialMediaTools } from './tools/social-media-tools';
import { MediaTools } from './tools/media-tools';
import { ObjectTools } from './tools/object-tools';
import { AssociationTools } from './tools/association-tools';
import { CustomFieldV2Tools } from './tools/custom-field-v2-tools';
import { WorkflowTools } from './tools/workflow-tools';
import { SurveyTools } from './tools/survey-tools';
import { StoreTools } from './tools/store-tools';
import { ProductsTools } from './tools/products-tools.js';
import { GHLConfig } from './types/ghl-types';

// Load environment variables
dotenv.config();

/**
 * HTTP MCP Server class for web deployment
 */
class GHLMCPHttpServer {
  private app: express.Application;
  private server: Server;
  private ghlClient: GHLApiClient;
  private contactTools: ContactTools;
  private conversationTools: ConversationTools;
  private blogTools: BlogTools;
  private opportunityTools: OpportunityTools;
  private calendarTools: CalendarTools;
  private emailTools: EmailTools;
  private locationTools: LocationTools;
  private emailISVTools: EmailISVTools;
  private socialMediaTools: SocialMediaTools;
  private mediaTools: MediaTools;
  private objectTools: ObjectTools;
  private associationTools: AssociationTools;
  private customFieldV2Tools: CustomFieldV2Tools;
  private workflowTools: WorkflowTools;
  private surveyTools: SurveyTools;
  private storeTools: StoreTools;
  private productsTools: ProductsTools;
  private port: number;

  constructor() {
    this.port = parseInt(process.env.PORT || process.env.MCP_SERVER_PORT || '8000');
    
    // Initialize Express app
    this.app = express();
    this.setupExpress();

    // Initialize MCP server with capabilities
    this.server = new Server(
      {
        name: 'ghl-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Initialize GHL API client
    this.ghlClient = this.initializeGHLClient();
    
    // Initialize tools
    this.contactTools = new ContactTools(this.ghlClient);
    this.conversationTools = new ConversationTools(this.ghlClient);
    this.blogTools = new BlogTools(this.ghlClient);
    this.opportunityTools = new OpportunityTools(this.ghlClient);
    this.calendarTools = new CalendarTools(this.ghlClient);
    this.emailTools = new EmailTools(this.ghlClient);
    this.locationTools = new LocationTools(this.ghlClient);
    this.emailISVTools = new EmailISVTools(this.ghlClient);
    this.socialMediaTools = new SocialMediaTools(this.ghlClient);
    this.mediaTools = new MediaTools(this.ghlClient);
    this.objectTools = new ObjectTools(this.ghlClient);
    this.associationTools = new AssociationTools(this.ghlClient);
    this.customFieldV2Tools = new CustomFieldV2Tools(this.ghlClient);
    this.workflowTools = new WorkflowTools(this.ghlClient);
    this.surveyTools = new SurveyTools(this.ghlClient);
    this.storeTools = new StoreTools(this.ghlClient);
    this.productsTools = new ProductsTools(this.ghlClient);

    // Setup MCP handlers
    this.setupMCPHandlers();
    this.setupRoutes();
  }

  /**
   * Setup Express middleware and configuration
   */
  private setupExpress(): void {
    // Enable CORS for ChatGPT integration
    this.app.use(cors({
      origin: ['https://chatgpt.com', 'https://chat.openai.com', 'http://localhost:*'],
      methods: ['GET', 'POST', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-App-Key', 'locationId'],
      credentials: true
    }));

    // Parse JSON requests
    this.app.use(express.json());

    // Request logging
    this.app.use((req, res, next) => {
      console.log(`[HTTP] ${req.method} ${req.path} - ${new Date().toISOString()}`);
      next();
    });
  }

  /**
   * Initialize GoHighLevel API client with configuration
   * NOTE: This is kept for backwards compatibility but will use dummy data since
   * actual tokens come from request headers in multi-tenant mode
   */
  private initializeGHLClient(): GHLApiClient {
    // Load configuration from environment with defaults for multi-tenant mode
    const config: GHLConfig = {
      accessToken: process.env.GHL_API_KEY || 'dummy-token', // Will be overridden by request headers
      baseUrl: process.env.GHL_BASE_URL || 'https://services.leadconnectorhq.com',
      version: '2021-07-28',
      locationId: process.env.GHL_LOCATION_ID || 'dummy-location' // Will be overridden by request headers
    };

    console.log('[GHL MCP HTTP] Initializing default GHL API client (will be overridden by request headers)...');
    console.log(`[GHL MCP HTTP] Base URL: ${config.baseUrl}`);
    console.log(`[GHL MCP HTTP] Version: ${config.version}`);

    return new GHLApiClient(config);
  }

  /**
   * Create a dynamic GHL API client using headers from the request
   * This enables multi-tenant support where each request provides its own auth
   */
  private createDynamicGHLClient(req: express.Request): GHLApiClient {
    if (!req.ghlAuth) {
      throw new Error('Request missing GHL authentication data');
    }

    const config: GHLConfig = {
      accessToken: req.ghlAuth.accessToken,
      baseUrl: process.env.GHL_BASE_URL || 'https://services.leadconnectorhq.com',
      version: '2021-07-28',
      locationId: req.ghlAuth.locationId
    };

    console.log(`[GHL Dynamic Client] Creating client for location: ${config.locationId}`);
    return new GHLApiClient(config);
  }

  /**
   * Setup MCP request handlers
   */
  private setupMCPHandlers(): void {
    // Handle list tools requests (OpenAI Custom Connectors compatible)
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      console.log('[GHL MCP HTTP] Listing OpenAI Custom Connector tools...');
      
      try {
        // Only expose search and fetch tools for OpenAI Custom Connectors
        const openaiTools = [
          {
            name: 'search',
            description: 'Search GHL contacts by query string',
            inputSchema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'Search query for contacts (name, email, phone, or tags)'
                },
                limit: {
                  type: 'number',
                  description: 'Maximum number of contacts to return (default: 10)',
                  minimum: 1,
                  maximum: 50,
                  default: 10
                }
              },
              required: ['query']
            }
          },
          {
            name: 'fetch',
            description: 'Fetch detailed information about a specific GHL contact',
            inputSchema: {
              type: 'object',
              properties: {
                id: {
                  type: 'string',
                  description: 'Contact ID to fetch'
                },
                url: {
                  type: 'string',
                  description: 'Contact URL to extract ID from'
                }
              },
              oneOf: [
                { required: ['id'] },
                { required: ['url'] }
              ]
            }
          }
        ];
        
        console.log(`[GHL MCP HTTP] Registered ${openaiTools.length} OpenAI Custom Connector tools`);
        
        return {
          tools: openaiTools
        };
      } catch (error) {
        console.error('[GHL MCP HTTP] Error listing tools:', error);
        throw new McpError(
          ErrorCode.InternalError,
          `Failed to list tools: ${error}`
        );
      }
    });

    // Handle tool execution requests (OpenAI Custom Connectors compatible)
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      
      console.log(`[GHL MCP HTTP] Executing OpenAI Custom Connector tool: ${name}`);

      try {
        let result: any;

        // Only support OpenAI Custom Connector tools: search and fetch
        if (name === 'search') {
          // Map search to contact search for demonstration
          result = await this.contactTools.executeTool('search_contacts', args || {});
          
          // Format response for OpenAI Custom Connectors
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  results: Array.isArray(result.contacts) ? result.contacts.slice(0, 10).map((contact: any) => ({
                    id: contact.id || 'unknown',
                    title: `${contact.firstName} ${contact.lastName}`.trim() || contact.email || 'Contact',
                    text: `Email: ${contact.email || 'N/A'}\nPhone: ${contact.phone || 'N/A'}\nTags: ${contact.tags?.join(', ') || 'None'}`,
                    url: `https://app.gohighlevel.com/contacts/${contact.id}`
                  })) : []
                }, null, 2)
              }
            ]
          };
          
        } else if (name === 'fetch') {
          // Map fetch to get specific contact
          const contactId = args?.id || (typeof args?.url === 'string' ? args.url.split('/').pop() : undefined);
          if (contactId) {
            result = await this.contactTools.executeTool('get_contact', { contactId });
            
            // Format response for OpenAI Custom Connectors  
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    id: result.id || contactId,
                    title: `${result.firstName} ${result.lastName}`.trim() || result.email || 'Contact Details',
                    text: `Full Contact Information:\n\nName: ${result.firstName} ${result.lastName}\nEmail: ${result.email}\nPhone: ${result.phone}\nCompany: ${result.companyName || 'N/A'}\nSource: ${result.source || 'N/A'}\nTags: ${result.tags?.join(', ') || 'None'}\n\nLast Activity: ${result.lastActivityDate || 'N/A'}\nDate Added: ${result.dateAdded || 'N/A'}`,
                    url: `https://app.gohighlevel.com/contacts/${result.id}`
                  }, null, 2)
                }
              ]
            };
          } else {
            throw new Error('Missing contact ID or URL for fetch operation');
          }
          
        } else {
          throw new Error(`Unsupported tool for OpenAI Custom Connectors: ${name}. Only 'search' and 'fetch' are supported.`);
        }

        // This should not be reached due to early returns above
        console.log(`[GHL MCP HTTP] Tool ${name} executed successfully`);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      } catch (error) {
        console.error(`[GHL MCP HTTP] Error executing tool ${name}:`, error);
        
        throw new McpError(
          ErrorCode.InternalError,
          `Tool execution failed: ${error}`
        );
      }
    });
  }

  /**
   * Setup HTTP routes
   */
  private setupRoutes(): void {
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({ 
        status: 'healthy',
        server: 'ghl-mcp-server',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        tools: this.getToolsCount()
      });
    });

    // MCP capabilities endpoint
    this.app.get('/capabilities', (req, res) => {
      res.json({
        capabilities: {
          tools: {},
        },
        server: {
          name: 'ghl-mcp-server',
          version: '1.0.0'
        }
      });
    });

    // Tools listing endpoint (OpenAI Custom Connectors compatible)
    this.app.get('/tools', authGuard, async (req, res) => {
      try {
        // Only expose search and fetch tools for OpenAI Custom Connectors
        const openaiTools = [
          {
            id: 'search',
            description: 'Search GHL contacts by query string'
          },
          {
            id: 'fetch',
            description: 'Fetch detailed information about a specific GHL contact'
          }
        ];
        
        console.log(`[OpenAI Custom Connectors] Returning ${openaiTools.length} tools`);
        res.json(openaiTools);
      } catch (error) {
        console.error('[OpenAI Custom Connectors] Error listing tools:', error);
        res.status(500).json({ error: 'Failed to list tools' });
      }
    });

    // Tool execution endpoint (OpenAI Custom Connectors compatible)
    this.app.post('/execute', authGuard, async (req, res) => {
      const { tool, input } = req.body || {};
      
      if (!tool) {
        res.status(400).json({ error: 'Missing tool parameter' });
        return;
      }

      console.log(`[OpenAI Custom Connectors] Executing tool: ${tool}`);

      try {
        // Create a dynamic GHL client instance with headers from request
        const ghlClient = this.createDynamicGHLClient(req);
        let result: any;

        // Only support OpenAI Custom Connector tools: search and fetch
        if (tool === 'search') {
          // Map search to contact search for demonstration
          const dynamicContactTools = new (require('./tools/contact-tools').ContactTools)(ghlClient);
          result = await dynamicContactTools.executeTool('search_contacts', input || {});
          
          // Format response for OpenAI Custom Connectors
          result = {
            results: Array.isArray(result.contacts) ? result.contacts.slice(0, 10).map((contact: any) => ({
              id: contact.id || 'unknown',
              title: `${contact.firstName} ${contact.lastName}`.trim() || contact.email || 'Contact',
              text: `Email: ${contact.email || 'N/A'}\nPhone: ${contact.phone || 'N/A'}\nTags: ${contact.tags?.join(', ') || 'None'}`,
              url: `https://app.gohighlevel.com/contacts/${contact.id}`
            })) : []
          };
          
        } else if (tool === 'fetch') {
          // Map fetch to get specific contact
          const contactId = input?.id || (typeof input?.url === 'string' ? input.url.split('/').pop() : undefined);
          if (!contactId) {
            res.status(400).json({ error: 'Missing contact ID or URL for fetch operation' });
            return;
          }
          
          const dynamicContactTools = new (require('./tools/contact-tools').ContactTools)(ghlClient);
          result = await dynamicContactTools.executeTool('get_contact', { contactId });
          
          // Format response for OpenAI Custom Connectors  
          result = {
            id: result.id || contactId,
            title: `${result.firstName} ${result.lastName}`.trim() || result.email || 'Contact Details',
            text: `Full Contact Information:\n\nName: ${result.firstName} ${result.lastName}\nEmail: ${result.email}\nPhone: ${result.phone}\nCompany: ${result.companyName || 'N/A'}\nSource: ${result.source || 'N/A'}\nTags: ${result.tags?.join(', ') || 'None'}\n\nLast Activity: ${result.lastActivityDate || 'N/A'}\nDate Added: ${result.dateAdded || 'N/A'}`,
            url: `https://app.gohighlevel.com/contacts/${result.id}`
          };
          
        } else {
          res.status(400).json({ error: `Unsupported tool for OpenAI Custom Connectors: ${tool}. Only 'search' and 'fetch' are supported.` });
          return;
        }

        console.log(`[OpenAI Custom Connectors] Tool ${tool} executed successfully`);
        res.json(result);

      } catch (error: any) {
        console.error(`[OpenAI Custom Connectors] Error executing tool ${tool}:`, error);
        res.status(500).json({ error: `Tool execution failed: ${error.message}` });
      }
    });

    // SSE endpoint for ChatGPT MCP connection
    const handleSSE = async (req: express.Request, res: express.Response) => {
      const sessionId = req.query.sessionId || 'unknown';
      console.log(`[GHL MCP HTTP] New SSE connection from: ${req.ip}, sessionId: ${sessionId}, method: ${req.method}`);
      
      try {
        // Create SSE transport (this will set the headers)
        const transport = new SSEServerTransport('/sse', res);
        
        // Connect MCP server to transport
        await this.server.connect(transport);
        
        console.log(`[GHL MCP HTTP] SSE connection established for session: ${sessionId}`);
        
        // Handle client disconnect
        req.on('close', () => {
          console.log(`[GHL MCP HTTP] SSE connection closed for session: ${sessionId}`);
        });
        
      } catch (error) {
        console.error(`[GHL MCP HTTP] SSE connection error for session ${sessionId}:`, error);
        
        // Only send error response if headers haven't been sent yet
        if (!res.headersSent) {
          res.status(500).json({ error: 'Failed to establish SSE connection' });
        } else {
          // If headers were already sent, close the connection
          res.end();
        }
      }
    };

    // Handle both GET and POST for SSE (MCP protocol requirements)
    this.app.get('/sse', authGuard, handleSSE);
    this.app.post('/sse', authGuard, handleSSE);
    
    // ChatGPT Custom Connectors requires /sse/ with trailing slash
    this.app.get('/sse/', authGuard, handleSSE);
    this.app.post('/sse/', authGuard, handleSSE);

    // Root endpoint with server info
    this.app.get('/', (req, res) => {
      res.json({
        name: 'GoHighLevel MCP Server',
        version: '1.0.0',
        status: 'running',
        endpoints: {
          health: '/health',
          capabilities: '/capabilities',
          tools: '/tools',
          sse: '/sse'
        },
        tools: this.getToolsCount(),
        documentation: 'https://github.com/your-repo/ghl-mcp-server'
      });
    });
  }

  /**
   * Get tools count summary
   */
  private getToolsCount() {
    return {
      contact: this.contactTools.getToolDefinitions().length,
      conversation: this.conversationTools.getToolDefinitions().length,
      blog: this.blogTools.getToolDefinitions().length,
      opportunity: this.opportunityTools.getToolDefinitions().length,
      calendar: this.calendarTools.getToolDefinitions().length,
      email: this.emailTools.getToolDefinitions().length,
      location: this.locationTools.getToolDefinitions().length,
      emailISV: this.emailISVTools.getToolDefinitions().length,
      socialMedia: this.socialMediaTools.getTools().length,
      media: this.mediaTools.getToolDefinitions().length,
      objects: this.objectTools.getToolDefinitions().length,
      associations: this.associationTools.getTools().length,
      customFieldsV2: this.customFieldV2Tools.getTools().length,
      workflows: this.workflowTools.getTools().length,
      surveys: this.surveyTools.getTools().length,
      store: this.storeTools.getTools().length,
      products: this.productsTools.getTools().length,
      total: this.contactTools.getToolDefinitions().length + 
             this.conversationTools.getToolDefinitions().length + 
             this.blogTools.getToolDefinitions().length +
             this.opportunityTools.getToolDefinitions().length +
             this.calendarTools.getToolDefinitions().length +
             this.emailTools.getToolDefinitions().length +
             this.locationTools.getToolDefinitions().length +
             this.emailISVTools.getToolDefinitions().length +
             this.socialMediaTools.getTools().length +
             this.mediaTools.getToolDefinitions().length +
             this.objectTools.getToolDefinitions().length +
             this.associationTools.getTools().length +
             this.customFieldV2Tools.getTools().length +
             this.workflowTools.getTools().length +
             this.surveyTools.getTools().length +
             this.storeTools.getTools().length +
             this.productsTools.getTools().length
    };
  }

  /**
   * Tool name validation helpers
   */
  private isContactTool(toolName: string): boolean {
    const contactToolNames = [
      // Basic Contact Management
      'create_contact', 'search_contacts', 'get_contact', 'update_contact',
      'add_contact_tags', 'remove_contact_tags', 'delete_contact',
      // Task Management
      'get_contact_tasks', 'create_contact_task', 'get_contact_task', 'update_contact_task',
      'delete_contact_task', 'update_task_completion',
      // Note Management
      'get_contact_notes', 'create_contact_note', 'get_contact_note', 'update_contact_note',
      'delete_contact_note',
      // Advanced Operations
      'upsert_contact', 'get_duplicate_contact', 'get_contacts_by_business', 'get_contact_appointments',
      // Bulk Operations
      'bulk_update_contact_tags', 'bulk_update_contact_business',
      // Followers Management
      'add_contact_followers', 'remove_contact_followers',
      // Campaign Management
      'add_contact_to_campaign', 'remove_contact_from_campaign', 'remove_contact_from_all_campaigns',
      // Workflow Management
      'add_contact_to_workflow', 'remove_contact_from_workflow'
    ];
    return contactToolNames.includes(toolName);
  }

  private isConversationTool(toolName: string): boolean {
    const conversationToolNames = [
      // Basic conversation operations
      'send_sms', 'send_email', 'search_conversations', 'get_conversation',
      'get_conversation_with_date_filter', 'create_conversation', 'update_conversation',
      'delete_conversation', 'get_recent_messages',
      // Message management
      'get_email_message', 'get_message', 'upload_message_attachments', 'update_message_status',
      // Manual message creation
      'add_inbound_message', 'add_outbound_call',
      // Call recordings & transcriptions
      'get_message_recording', 'get_message_transcription', 'download_transcription',
      // Scheduling management
      'cancel_scheduled_message', 'cancel_scheduled_email',
      // Live chat features
      'live_chat_typing'
    ];
    return conversationToolNames.includes(toolName);
  }

  private isBlogTool(toolName: string): boolean {
    const blogToolNames = [
      'create_blog_post', 'update_blog_post', 'get_blog_posts', 'get_blog_sites',
      'get_blog_authors', 'get_blog_categories', 'check_url_slug'
    ];
    return blogToolNames.includes(toolName);
  }

  private isOpportunityTool(toolName: string): boolean {
    const opportunityToolNames = [
      'search_opportunities', 'get_pipelines', 'get_opportunity', 'create_opportunity',
      'update_opportunity_status', 'delete_opportunity', 'update_opportunity', 
      'upsert_opportunity', 'add_opportunity_followers', 'remove_opportunity_followers'
    ];
    return opportunityToolNames.includes(toolName);
  }

  private isCalendarTool(toolName: string): boolean {
    const calendarToolNames = [
      // Calendar Groups Management
      'get_calendar_groups', 'create_calendar_group', 'validate_group_slug',
      'update_calendar_group', 'delete_calendar_group', 'disable_calendar_group',
      // Calendars
      'get_calendars', 'create_calendar', 'get_calendar', 'update_calendar', 'delete_calendar',
      // Events and Appointments
      'get_calendar_events', 'get_free_slots', 'create_appointment', 'get_appointment',
      'update_appointment', 'delete_appointment',
      // Appointment Notes
      'get_appointment_notes', 'create_appointment_note', 'update_appointment_note', 'delete_appointment_note',
      // Calendar Resources
      'get_calendar_resources', 'get_calendar_resource_by_id', 'update_calendar_resource', 'delete_calendar_resource',
      // Calendar Notifications
      'get_calendar_notifications', 'create_calendar_notification', 'update_calendar_notification', 'delete_calendar_notification',
      // Blocked Slots
      'create_block_slot', 'update_block_slot', 'get_blocked_slots', 'delete_blocked_slot'
    ];
    return calendarToolNames.includes(toolName);
  }

  private isEmailTool(toolName: string): boolean {
    const emailToolNames = [
      'get_email_campaigns', 'create_email_template', 'get_email_templates',
      'update_email_template', 'delete_email_template'
    ];
    return emailToolNames.includes(toolName);
  }

  private isLocationTool(toolName: string): boolean {
    const locationToolNames = [
      // Location Management
      'search_locations', 'get_location', 'create_location', 'update_location', 'delete_location',
      // Location Tags
      'get_location_tags', 'create_location_tag', 'get_location_tag', 'update_location_tag', 'delete_location_tag',
      // Location Tasks
      'search_location_tasks',
      // Custom Fields
      'get_location_custom_fields', 'create_location_custom_field', 'get_location_custom_field', 
      'update_location_custom_field', 'delete_location_custom_field',
      // Custom Values
      'get_location_custom_values', 'create_location_custom_value', 'get_location_custom_value',
      'update_location_custom_value', 'delete_location_custom_value',
      // Templates
      'get_location_templates', 'delete_location_template',
      // Timezones
      'get_timezones'
    ];
    return locationToolNames.includes(toolName);
  }

  private isEmailISVTool(toolName: string): boolean {
    const emailISVToolNames = [
      'verify_email'
    ];
    return emailISVToolNames.includes(toolName);
  }

  private isSocialMediaTool(toolName: string): boolean {
    const socialMediaToolNames = [
      // Post Management
      'search_social_posts', 'create_social_post', 'get_social_post', 'update_social_post',
      'delete_social_post', 'bulk_delete_social_posts',
      // Account Management
      'get_social_accounts', 'delete_social_account',
      // CSV Operations
      'upload_social_csv', 'get_csv_upload_status', 'set_csv_accounts',
      // Categories & Tags
      'get_social_categories', 'get_social_category', 'get_social_tags', 'get_social_tags_by_ids',
      // OAuth Integration
      'start_social_oauth', 'get_platform_accounts'
    ];
    return socialMediaToolNames.includes(toolName);
  }

  private isMediaTool(toolName: string): boolean {
    const mediaToolNames = [
      'get_media_files', 'upload_media_file', 'delete_media_file'
    ];
    return mediaToolNames.includes(toolName);
  }

  private isObjectTool(toolName: string): boolean {
    const objectToolNames = [
      'get_all_objects', 'create_object_schema', 'get_object_schema', 'update_object_schema',
      'create_object_record', 'get_object_record', 'update_object_record', 'delete_object_record',
      'search_object_records'
    ];
    return objectToolNames.includes(toolName);
  }

  private isAssociationTool(toolName: string): boolean {
    const associationToolNames = [
      'ghl_get_all_associations', 'ghl_create_association', 'ghl_get_association_by_id',
      'ghl_update_association', 'ghl_delete_association', 'ghl_get_association_by_key',
      'ghl_get_association_by_object_key', 'ghl_create_relation', 'ghl_get_relations_by_record',
      'ghl_delete_relation'
    ];
    return associationToolNames.includes(toolName);
  }

  private isCustomFieldV2Tool(toolName: string): boolean {
    const customFieldV2ToolNames = [
      'ghl_get_custom_field_by_id', 'ghl_create_custom_field', 'ghl_update_custom_field',
      'ghl_delete_custom_field', 'ghl_get_custom_fields_by_object_key', 'ghl_create_custom_field_folder',
      'ghl_update_custom_field_folder', 'ghl_delete_custom_field_folder'
    ];
    return customFieldV2ToolNames.includes(toolName);
  }

  private isWorkflowTool(toolName: string): boolean {
    const workflowToolNames = [
      'ghl_get_workflows'
    ];
    return workflowToolNames.includes(toolName);
  }

  private isSurveyTool(toolName: string): boolean {
    const surveyToolNames = [
      'ghl_get_surveys',
      'ghl_get_survey_submissions'
    ];
    return surveyToolNames.includes(toolName);
  }

  private isStoreTool(toolName: string): boolean {
    const storeToolNames = [
      'ghl_create_shipping_zone', 'ghl_list_shipping_zones', 'ghl_get_shipping_zone',
      'ghl_update_shipping_zone', 'ghl_delete_shipping_zone', 'ghl_get_available_shipping_rates',
      'ghl_create_shipping_rate', 'ghl_list_shipping_rates', 'ghl_get_shipping_rate',
      'ghl_update_shipping_rate', 'ghl_delete_shipping_rate', 'ghl_create_shipping_carrier',
      'ghl_list_shipping_carriers', 'ghl_get_shipping_carrier', 'ghl_update_shipping_carrier',
      'ghl_delete_shipping_carrier', 'ghl_create_store_setting', 'ghl_get_store_setting'
    ];
    return storeToolNames.includes(toolName);
  }

  private isProductsTool(toolName: string): boolean {
    const productsToolNames = [
      'ghl_create_product', 'ghl_list_products', 'ghl_get_product', 'ghl_update_product',
      'ghl_delete_product', 'ghl_bulk_update_products', 'ghl_create_price', 'ghl_list_prices',
      'ghl_get_price', 'ghl_update_price', 'ghl_delete_price', 'ghl_list_inventory',
      'ghl_update_inventory', 'ghl_get_product_store_stats', 'ghl_update_product_store',
      'ghl_create_product_collection', 'ghl_list_product_collections', 'ghl_get_product_collection',
      'ghl_update_product_collection', 'ghl_delete_product_collection', 'ghl_list_product_reviews',
      'ghl_get_reviews_count', 'ghl_update_product_review', 'ghl_delete_product_review',
      'ghl_bulk_update_product_reviews'
    ];
    return productsToolNames.includes(toolName);
  }

  /**
   * Test GHL API connection
   */
  private async testGHLConnection(): Promise<void> {
    try {
      console.log('[GHL MCP HTTP] Testing GHL API connection...');
      
      const result = await this.ghlClient.testConnection();
      
      console.log('[GHL MCP HTTP] ✅ GHL API connection successful');
      console.log(`[GHL MCP HTTP] Connected to location: ${result.data?.locationId}`);
    } catch (error) {
      console.error('[GHL MCP HTTP] ❌ GHL API connection failed:', error);
      throw new Error(`Failed to connect to GHL API: ${error}`);
    }
  }

  /**
   * Start the HTTP server
   */
  async start(): Promise<void> {
    console.log('🚀 Starting GoHighLevel MCP HTTP Server...');
    console.log('=========================================');
    
    try {
      // Note: Skip GHL API connection test in multi-tenant mode
      // Connections are tested per-request with dynamic tokens
      
      // Start HTTP server
      this.app.listen(this.port, '0.0.0.0', () => {
        console.log('✅ GoHighLevel MCP HTTP Server started successfully!');
        console.log(`🌐 Server running on: http://0.0.0.0:${this.port}`);
        console.log(`🔗 SSE Endpoint: http://0.0.0.0:${this.port}/sse`);
        console.log(`📋 Tools Available: ${this.getToolsCount().total}`);
        console.log('🎯 Ready for ChatGPT integration!');
        console.log('=========================================');
      });
      
    } catch (error) {
      console.error('❌ Failed to start GHL MCP HTTP Server:', error);
      process.exit(1);
    }
  }
}

/**
 * Handle graceful shutdown
 */
function setupGracefulShutdown(): void {
  const shutdown = (signal: string) => {
    console.log(`\n[GHL MCP HTTP] Received ${signal}, shutting down gracefully...`);
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
    // Setup graceful shutdown
    setupGracefulShutdown();
    
    // Create and start HTTP server
    const server = new GHLMCPHttpServer();
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