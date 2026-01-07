/**
 * Enhanced Mock implementation of GHLApiClient for testing (v2)
 *
 * Improvements over v1:
 * - Stateful storage (remembers created/updated/deleted entities)
 * - Error scenario simulation (404, 401, 429, 500, validation)
 * - Configurable latency/delay simulation
 * - Input validation
 * - Comprehensive fixtures for various test scenarios
 * - Extended method coverage (opportunities, calendar, tasks, notes)
 * - Mock executor factory for pipeline/batch tests
 */

import {
  GHLApiResponse,
  GHLContact,
  GHLConversation,
  GHLMessage,
  GHLBlogPost,
  GHLBlogSite,
  GHLBlogAuthor,
  GHLBlogCategory,
  GHLTask,
  GHLNote,
  GHLAppointment,
  GHLOpportunity,
  GHLPipeline,
  GHLCalendar,
  GHLCalendarEvent
} from '../../src/types/ghl-types.js';

// ============================================================================
// SECTION 1: CONFIGURATION & TYPES
// ============================================================================

/**
 * Mock configuration options
 */
export interface MockConfig {
  /** Simulated latency in ms (0 = no delay) */
  latencyMs: number;
  /** Whether to throw errors for specific IDs */
  enableErrorScenarios: boolean;
  /** Whether to validate input */
  enableValidation: boolean;
  /** Access token for auth simulation */
  accessToken: string;
  /** Location ID */
  locationId: string;
}

/**
 * Error scenario configuration - use these IDs to trigger specific errors
 */
export const ERROR_TRIGGER_IDS = {
  NOT_FOUND: 'not_found',
  UNAUTHORIZED: 'unauthorized',
  RATE_LIMITED: 'rate_limited',
  SERVER_ERROR: 'server_error',
  VALIDATION_ERROR: 'validation_error',
  TIMEOUT: 'timeout'
} as const;

/**
 * Error responses mapped to trigger IDs
 */
const ERROR_RESPONSES: Record<string, { status: number; message: string }> = {
  [ERROR_TRIGGER_IDS.NOT_FOUND]: { status: 404, message: 'Resource not found' },
  [ERROR_TRIGGER_IDS.UNAUTHORIZED]: { status: 401, message: 'Invalid or expired access token' },
  [ERROR_TRIGGER_IDS.RATE_LIMITED]: { status: 429, message: 'Rate limit exceeded. Please retry after 60 seconds' },
  [ERROR_TRIGGER_IDS.SERVER_ERROR]: { status: 500, message: 'Internal server error' },
  [ERROR_TRIGGER_IDS.VALIDATION_ERROR]: { status: 400, message: 'Validation failed' },
  [ERROR_TRIGGER_IDS.TIMEOUT]: { status: 408, message: 'Request timeout' }
};

// ============================================================================
// SECTION 2: MOCK DATA CONSTANTS (BASE TEMPLATES)
// ============================================================================

export const mockContact: GHLContact = {
  id: 'contact_123',
  locationId: 'test_location_123',
  firstName: 'John',
  lastName: 'Doe',
  name: 'John Doe',
  email: 'john.doe@example.com',
  phone: '+1-555-123-4567',
  tags: ['test', 'customer'],
  source: 'MCP Test',
  dateAdded: '2024-01-01T00:00:00.000Z',
  dateUpdated: '2024-01-01T00:00:00.000Z'
};

export const mockConversation: GHLConversation = {
  id: 'conv_123',
  contactId: 'contact_123',
  locationId: 'test_location_123',
  lastMessageBody: 'Test message',
  lastMessageType: 'TYPE_SMS',
  type: 'SMS',
  unreadCount: 0,
  fullName: 'John Doe',
  contactName: 'John Doe',
  email: 'john.doe@example.com',
  phone: '+1-555-123-4567'
};

export const mockMessage: GHLMessage = {
  id: 'msg_123',
  type: 1,
  messageType: 'TYPE_SMS',
  locationId: 'test_location_123',
  contactId: 'contact_123',
  conversationId: 'conv_123',
  dateAdded: '2024-01-01T00:00:00.000Z',
  body: 'Test SMS message',
  direction: 'outbound',
  status: 'sent',
  contentType: 'text/plain'
};

export const mockTask: GHLTask = {
  id: 'task_123',
  title: 'Follow up call',
  body: 'Call to discuss proposal',
  assignedTo: 'user_123',
  dueDate: '2024-01-15T10:00:00.000Z',
  completed: false,
  contactId: 'contact_123'
};

export const mockNote: GHLNote = {
  id: 'note_123',
  body: 'Interested in premium plan',
  userId: 'user_123',
  contactId: 'contact_123',
  dateAdded: '2024-01-01T00:00:00.000Z'
};

export const mockAppointment: GHLAppointment = {
  id: 'apt_123',
  calendarId: 'cal_123',
  status: 'confirmed',
  title: 'Discovery Call',
  appointmentStatus: 'confirmed',
  assignedUserId: 'user_123',
  notes: 'First meeting with client',
  startTime: '2024-01-15T14:00:00.000Z',
  endTime: '2024-01-15T15:00:00.000Z',
  locationId: 'test_location_123',
  contactId: 'contact_123',
  dateAdded: '2024-01-01T00:00:00.000Z',
  dateUpdated: '2024-01-01T00:00:00.000Z'
};

export const mockOpportunity: GHLOpportunity = {
  id: 'opp_123',
  name: 'Enterprise Deal',
  pipelineId: 'pipe_123',
  pipelineStageId: 'stage_123',
  status: 'open',
  contactId: 'contact_123',
  contact: {
    id: 'contact_123',
    name: 'John Doe',
    email: 'john.doe@example.com',
    phone: '+1-555-123-4567'
  },
  monetaryValue: 50000,
  assignedTo: 'user_123',
  locationId: 'test_location_123',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  lastStatusChangeAt: '2024-01-01T00:00:00.000Z'
};

export const mockPipeline: GHLPipeline = {
  id: 'pipe_123',
  name: 'Sales Pipeline',
  stages: [
    { id: 'stage_1', name: 'Lead', position: 0 },
    { id: 'stage_2', name: 'Qualified', position: 1 },
    { id: 'stage_3', name: 'Proposal', position: 2 },
    { id: 'stage_4', name: 'Negotiation', position: 3 },
    { id: 'stage_5', name: 'Closed Won', position: 4 }
  ],
  locationId: 'test_location_123',
  showInFunnel: true,
  showInPieChart: true
};

export const mockCalendar: GHLCalendar = {
  id: 'cal_123',
  name: 'Main Calendar',
  locationId: 'test_location_123',
  groupId: 'group_123',
  isActive: true,
  description: 'Primary appointment calendar',
  slug: 'main-calendar',
  widgetSlug: 'main-calendar',
  calendarType: 'round_robin',
  widgetType: 'classic',
  eventTitle: 'New Appointment',
  eventColor: '#4A90D9',
  slotDuration: 30,
  slotBuffer: 10,
  slotInterval: 30,
  appoinmentPerSlot: 1,
  appoinmentPerDay: 8,
  openHours: [],
  teamMembers: []
};

export const mockCalendarEvent: GHLCalendarEvent = {
  id: 'event_123',
  calendarId: 'cal_123',
  locationId: 'test_location_123',
  contactId: 'contact_123',
  title: 'Consultation Call',
  appointmentStatus: 'confirmed' as const,
  assignedUserId: 'user_123',
  startTime: '2024-01-15T14:00:00.000Z',
  endTime: '2024-01-15T15:00:00.000Z',
  dateAdded: '2024-01-01T00:00:00.000Z',
  dateUpdated: '2024-01-01T00:00:00.000Z'
};

export const mockBlogPost: GHLBlogPost = {
  _id: 'post_123',
  title: 'Test Blog Post',
  description: 'Test blog post description',
  imageUrl: 'https://example.com/image.jpg',
  imageAltText: 'Test image',
  urlSlug: 'test-blog-post',
  author: 'author_123',
  publishedAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  status: 'PUBLISHED',
  categories: ['cat_123'],
  tags: ['test', 'blog'],
  archived: false,
  rawHTML: '<h1>Test Content</h1>'
};

export const mockBlogSite: GHLBlogSite = {
  _id: 'blog_123',
  name: 'Test Blog Site'
};

export const mockBlogAuthor: GHLBlogAuthor = {
  _id: 'author_123',
  name: 'Test Author',
  locationId: 'test_location_123',
  updatedAt: '2024-01-01T00:00:00.000Z',
  canonicalLink: 'https://example.com/author/test'
};

export const mockBlogCategory: GHLBlogCategory = {
  _id: 'cat_123',
  label: 'Test Category',
  locationId: 'test_location_123',
  updatedAt: '2024-01-01T00:00:00.000Z',
  canonicalLink: 'https://example.com/category/test',
  urlSlug: 'test-category'
};

// ============================================================================
// SECTION 3: FIXTURES (PRE-BUILT DATA SETS)
// ============================================================================

/**
 * Contact fixtures for various test scenarios
 */
export const contactFixtures = {
  /** Empty array for edge case testing */
  empty: [] as GHLContact[],

  /** Single contact */
  single: [mockContact],

  /** Mixed states (active, inactive, with/without email) */
  mixed: [
    { ...mockContact, id: 'contact_1', tags: ['vip', 'active'], email: 'vip@example.com' },
    { ...mockContact, id: 'contact_2', tags: ['inactive'], email: 'inactive@example.com' },
    { ...mockContact, id: 'contact_3', tags: ['lead'], email: null as any }, // Edge case: no email
    { ...mockContact, id: 'contact_4', tags: ['customer'], phone: null as any }, // Edge case: no phone
    { ...mockContact, id: 'contact_5', tags: ['active', 'newsletter'], dnd: true }
  ],

  /** Large dataset for performance testing (100 items) */
  large: Array.from({ length: 100 }, (_, i) => ({
    ...mockContact,
    id: `contact_${i}`,
    firstName: `User${i}`,
    lastName: `Test${i}`,
    name: `User${i} Test${i}`,
    email: `user${i}@example.com`,
    phone: `+1-555-${String(i).padStart(3, '0')}-${String(i * 7 % 10000).padStart(4, '0')}`,
    tags: i % 3 === 0 ? ['vip'] : i % 2 === 0 ? ['customer'] : ['lead']
  })),

  /** Pagination test set */
  paginated: Array.from({ length: 50 }, (_, i) => ({
    ...mockContact,
    id: `contact_page_${i}`,
    email: `page${i}@example.com`
  }))
};

/**
 * Opportunity fixtures
 */
export const opportunityFixtures = {
  empty: [] as GHLOpportunity[],

  mixed: [
    { ...mockOpportunity, id: 'opp_1', status: 'open' as const, monetaryValue: 10000 },
    { ...mockOpportunity, id: 'opp_2', status: 'won' as const, monetaryValue: 50000 },
    { ...mockOpportunity, id: 'opp_3', status: 'lost' as const, monetaryValue: 25000 },
    { ...mockOpportunity, id: 'opp_4', status: 'open' as const, monetaryValue: 100000 },
    { ...mockOpportunity, id: 'opp_5', status: 'abandoned' as const, monetaryValue: 5000 }
  ],

  byPipeline: {
    pipe_sales: [
      { ...mockOpportunity, id: 'opp_s1', pipelineId: 'pipe_sales', pipelineStageId: 'stage_lead' },
      { ...mockOpportunity, id: 'opp_s2', pipelineId: 'pipe_sales', pipelineStageId: 'stage_qualified' }
    ],
    pipe_support: [
      { ...mockOpportunity, id: 'opp_sup1', pipelineId: 'pipe_support', pipelineStageId: 'stage_new' }
    ]
  }
};

/**
 * Conversation fixtures
 */
export const conversationFixtures = {
  empty: [] as GHLConversation[],

  mixed: [
    { ...mockConversation, id: 'conv_1', unreadCount: 0, type: 'SMS' },
    { ...mockConversation, id: 'conv_2', unreadCount: 5, type: 'Email' },
    { ...mockConversation, id: 'conv_3', unreadCount: 0, starred: true, type: 'SMS' },
    { ...mockConversation, id: 'conv_4', unreadCount: 2, type: 'WhatsApp' }
  ]
};

/**
 * Message fixtures
 */
export const messageFixtures = {
  empty: [] as GHLMessage[],

  conversation: [
    { ...mockMessage, id: 'msg_1', direction: 'inbound' as const, body: 'Hello, I need help' },
    { ...mockMessage, id: 'msg_2', direction: 'outbound' as const, body: 'Hi! How can I assist?' },
    { ...mockMessage, id: 'msg_3', direction: 'inbound' as const, body: 'I have a question about pricing' },
    { ...mockMessage, id: 'msg_4', direction: 'outbound' as const, body: 'Sure, let me explain our plans' }
  ]
};

// ============================================================================
// SECTION 4: HELPER FUNCTIONS
// ============================================================================

/**
 * Generate a unique ID with prefix
 */
const generateId = (prefix: string): string => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;

/**
 * Sleep for specified milliseconds
 */
const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Get error response for trigger ID
 */
const getErrorForTrigger = (id: string): { status: number; message: string } | null => {
  return ERROR_RESPONSES[id] || null;
};

/**
 * Create a GHL API error
 */
const createApiError = (status: number, message: string): Error => {
  const error = new Error(`GHL API Error (${status}): ${message}`);
  (error as any).statusCode = status;
  return error;
};

/**
 * Validation helpers
 */
const validators = {
  email: (email: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
  phone: (phone: string): boolean => /^\+?[\d\s-()]{10,}$/.test(phone),
  required: (value: any, fieldName: string): string | null =>
    value === undefined || value === null || value === ''
      ? `${fieldName} is required`
      : null,
  contactIdentifier: (email?: string, phone?: string): string | null =>
    !email && !phone ? 'Either email or phone is required' : null
};

// ============================================================================
// SECTION 5: STATEFUL MOCK CLIENT
// ============================================================================

/**
 * Enhanced Mock GHL API Client with state management
 */
export class MockGHLApiClientV2 {
  // Configuration
  private config: MockConfig;

  // State stores
  private contacts = new Map<string, GHLContact>();
  private conversations = new Map<string, GHLConversation>();
  private messages = new Map<string, GHLMessage[]>(); // conversationId -> messages
  private tasks = new Map<string, GHLTask[]>(); // contactId -> tasks
  private notes = new Map<string, GHLNote[]>(); // contactId -> notes
  private opportunities = new Map<string, GHLOpportunity>();
  private pipelines = new Map<string, GHLPipeline>();
  private calendars = new Map<string, GHLCalendar>();
  private appointments = new Map<string, GHLCalendarEvent>();
  private blogPosts = new Map<string, GHLBlogPost>();

  constructor(config: Partial<MockConfig> = {}) {
    this.config = {
      latencyMs: 0,
      enableErrorScenarios: true,
      enableValidation: true,
      accessToken: 'test_token',
      locationId: 'test_location_123',
      ...config
    };

    // Initialize with default data
    this.seedDefaultData();
  }

  /**
   * Seed initial mock data
   */
  private seedDefaultData(): void {
    // Add base mock entities
    this.contacts.set(mockContact.id!, mockContact);
    this.conversations.set(mockConversation.id, mockConversation);
    this.messages.set(mockConversation.id, [mockMessage]);
    this.tasks.set(mockContact.id!, [mockTask]);
    this.notes.set(mockContact.id!, [mockNote]);
    this.opportunities.set(mockOpportunity.id, mockOpportunity);
    this.pipelines.set(mockPipeline.id, mockPipeline);
    this.calendars.set(mockCalendar.id, mockCalendar);
    this.appointments.set(mockCalendarEvent.id, mockCalendarEvent);
    this.blogPosts.set(mockBlogPost._id, mockBlogPost);
  }

  /**
   * Reset all state to initial
   */
  reset(): void {
    this.contacts.clear();
    this.conversations.clear();
    this.messages.clear();
    this.tasks.clear();
    this.notes.clear();
    this.opportunities.clear();
    this.pipelines.clear();
    this.calendars.clear();
    this.appointments.clear();
    this.blogPosts.clear();
    this.seedDefaultData();
  }

  /**
   * Configure mock behavior
   */
  configure(config: Partial<MockConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): MockConfig {
    return { ...this.config };
  }

  /**
   * Apply configured latency
   */
  private async applyLatency(): Promise<void> {
    if (this.config.latencyMs > 0) {
      await sleep(this.config.latencyMs);
    }
  }

  /**
   * Check for error triggers and throw if applicable
   */
  private checkErrorTrigger(id: string): void {
    if (!this.config.enableErrorScenarios) return;

    const error = getErrorForTrigger(id);
    if (error) {
      throw createApiError(error.status, error.message);
    }
  }

  /**
   * Validate input and return errors
   */
  private validateInput(validations: Array<() => string | null>): string[] {
    if (!this.config.enableValidation) return [];

    const errors: string[] = [];
    for (const validate of validations) {
      const error = validate();
      if (error) errors.push(error);
    }
    return errors;
  }

  // ==========================================================================
  // CONTACT METHODS
  // ==========================================================================

  async createContact(contactData: any): Promise<GHLApiResponse<GHLContact>> {
    await this.applyLatency();

    // Validation
    const errors = this.validateInput([
      () => validators.contactIdentifier(contactData.email, contactData.phone)
    ]);

    if (errors.length > 0) {
      return {
        success: false,
        error: { message: errors.join('; '), statusCode: 400, details: errors }
      };
    }

    const id = generateId('contact');
    const contact: GHLContact = {
      ...mockContact,
      ...contactData,
      id,
      locationId: this.config.locationId,
      dateAdded: new Date().toISOString(),
      dateUpdated: new Date().toISOString()
    };

    this.contacts.set(id, contact);

    return { success: true, data: contact };
  }

  async getContact(contactId: string): Promise<GHLApiResponse<GHLContact>> {
    await this.applyLatency();
    this.checkErrorTrigger(contactId);

    const contact = this.contacts.get(contactId);
    if (!contact) {
      throw createApiError(404, 'Contact not found');
    }

    return { success: true, data: contact };
  }

  async updateContact(contactId: string, updates: any): Promise<GHLApiResponse<GHLContact>> {
    await this.applyLatency();
    this.checkErrorTrigger(contactId);

    const contact = this.contacts.get(contactId);
    if (!contact) {
      throw createApiError(404, 'Contact not found');
    }

    const updatedContact: GHLContact = {
      ...contact,
      ...updates,
      id: contactId,
      dateUpdated: new Date().toISOString()
    };

    this.contacts.set(contactId, updatedContact);

    return { success: true, data: updatedContact };
  }

  async deleteContact(contactId: string): Promise<GHLApiResponse<{ succeded: boolean }>> {
    await this.applyLatency();
    this.checkErrorTrigger(contactId);

    const existed = this.contacts.has(contactId);
    if (!existed) {
      throw createApiError(404, 'Contact not found');
    }

    this.contacts.delete(contactId);
    this.tasks.delete(contactId);
    this.notes.delete(contactId);

    return { success: true, data: { succeded: true } };
  }

  async searchContacts(searchParams: any): Promise<GHLApiResponse<any>> {
    await this.applyLatency();

    let contacts = Array.from(this.contacts.values());

    // Apply filters
    if (searchParams.query) {
      const query = searchParams.query.toLowerCase();
      contacts = contacts.filter(c =>
        c.name?.toLowerCase().includes(query) ||
        c.email?.toLowerCase().includes(query) ||
        c.phone?.includes(query)
      );
    }

    if (searchParams.filters?.email) {
      contacts = contacts.filter(c => c.email === searchParams.filters.email);
    }

    if (searchParams.filters?.phone) {
      contacts = contacts.filter(c => c.phone === searchParams.filters.phone);
    }

    if (searchParams.filters?.tags?.length) {
      contacts = contacts.filter(c =>
        searchParams.filters.tags.some((tag: string) => c.tags?.includes(tag))
      );
    }

    // Apply pagination
    const limit = searchParams.limit || 25;
    const skip = searchParams.startAfter || 0;
    const paginatedContacts = contacts.slice(skip, skip + limit);

    return {
      success: true,
      data: {
        contacts: paginatedContacts,
        total: contacts.length
      }
    };
  }

  async addContactTags(contactId: string, tags: string[]): Promise<GHLApiResponse<{ tags: string[] }>> {
    await this.applyLatency();
    this.checkErrorTrigger(contactId);

    const contact = this.contacts.get(contactId);
    if (!contact) {
      throw createApiError(404, 'Contact not found');
    }

    const existingTags = contact.tags || [];
    const newTags = Array.from(new Set([...existingTags, ...tags]));
    contact.tags = newTags;
    contact.dateUpdated = new Date().toISOString();

    return { success: true, data: { tags: newTags } };
  }

  async removeContactTags(contactId: string, tags: string[]): Promise<GHLApiResponse<{ tags: string[] }>> {
    await this.applyLatency();
    this.checkErrorTrigger(contactId);

    const contact = this.contacts.get(contactId);
    if (!contact) {
      throw createApiError(404, 'Contact not found');
    }

    const remainingTags = (contact.tags || []).filter(t => !tags.includes(t));
    contact.tags = remainingTags;
    contact.dateUpdated = new Date().toISOString();

    return { success: true, data: { tags: remainingTags } };
  }

  // ==========================================================================
  // TASK METHODS
  // ==========================================================================

  async getContactTasks(contactId: string): Promise<GHLApiResponse<GHLTask[]>> {
    await this.applyLatency();
    this.checkErrorTrigger(contactId);

    const tasks = this.tasks.get(contactId) || [];
    return { success: true, data: tasks };
  }

  async createContactTask(contactId: string, taskData: any): Promise<GHLApiResponse<GHLTask>> {
    await this.applyLatency();
    this.checkErrorTrigger(contactId);

    const errors = this.validateInput([
      () => validators.required(taskData.title, 'title'),
      () => validators.required(taskData.dueDate, 'dueDate')
    ]);

    if (errors.length > 0) {
      return {
        success: false,
        error: { message: errors.join('; '), statusCode: 400, details: errors }
      };
    }

    const task: GHLTask = {
      ...taskData,
      id: generateId('task'),
      contactId,
      completed: taskData.completed || false
    };

    const existingTasks = this.tasks.get(contactId) || [];
    this.tasks.set(contactId, [...existingTasks, task]);

    return { success: true, data: task };
  }

  async getContactTask(contactId: string, taskId: string): Promise<GHLApiResponse<GHLTask>> {
    await this.applyLatency();
    this.checkErrorTrigger(taskId);

    const tasks = this.tasks.get(contactId) || [];
    const task = tasks.find(t => t.id === taskId);

    if (!task) {
      throw createApiError(404, 'Task not found');
    }

    return { success: true, data: task };
  }

  async updateContactTask(contactId: string, taskId: string, updates: any): Promise<GHLApiResponse<GHLTask>> {
    await this.applyLatency();
    this.checkErrorTrigger(taskId);

    const tasks = this.tasks.get(contactId) || [];
    const taskIndex = tasks.findIndex(t => t.id === taskId);

    if (taskIndex === -1) {
      throw createApiError(404, 'Task not found');
    }

    const updatedTask = { ...tasks[taskIndex], ...updates };
    tasks[taskIndex] = updatedTask;

    return { success: true, data: updatedTask };
  }

  async deleteContactTask(contactId: string, taskId: string): Promise<GHLApiResponse<{ succeded: boolean }>> {
    await this.applyLatency();
    this.checkErrorTrigger(taskId);

    const tasks = this.tasks.get(contactId) || [];
    const filtered = tasks.filter(t => t.id !== taskId);

    if (filtered.length === tasks.length) {
      throw createApiError(404, 'Task not found');
    }

    this.tasks.set(contactId, filtered);

    return { success: true, data: { succeded: true } };
  }

  async updateTaskCompletion(contactId: string, taskId: string, completed: boolean): Promise<GHLApiResponse<GHLTask>> {
    return this.updateContactTask(contactId, taskId, { completed });
  }

  // ==========================================================================
  // NOTE METHODS
  // ==========================================================================

  async getContactNotes(contactId: string): Promise<GHLApiResponse<GHLNote[]>> {
    await this.applyLatency();
    this.checkErrorTrigger(contactId);

    const notes = this.notes.get(contactId) || [];
    return { success: true, data: notes };
  }

  async createContactNote(contactId: string, noteData: any): Promise<GHLApiResponse<GHLNote>> {
    await this.applyLatency();
    this.checkErrorTrigger(contactId);

    const errors = this.validateInput([
      () => validators.required(noteData.body, 'body')
    ]);

    if (errors.length > 0) {
      return {
        success: false,
        error: { message: errors.join('; '), statusCode: 400, details: errors }
      };
    }

    const note: GHLNote = {
      ...noteData,
      id: generateId('note'),
      contactId,
      dateAdded: new Date().toISOString()
    };

    const existingNotes = this.notes.get(contactId) || [];
    this.notes.set(contactId, [...existingNotes, note]);

    return { success: true, data: note };
  }

  async getContactNote(contactId: string, noteId: string): Promise<GHLApiResponse<GHLNote>> {
    await this.applyLatency();
    this.checkErrorTrigger(noteId);

    const notes = this.notes.get(contactId) || [];
    const note = notes.find(n => n.id === noteId);

    if (!note) {
      throw createApiError(404, 'Note not found');
    }

    return { success: true, data: note };
  }

  async updateContactNote(contactId: string, noteId: string, updates: any): Promise<GHLApiResponse<GHLNote>> {
    await this.applyLatency();
    this.checkErrorTrigger(noteId);

    const notes = this.notes.get(contactId) || [];
    const noteIndex = notes.findIndex(n => n.id === noteId);

    if (noteIndex === -1) {
      throw createApiError(404, 'Note not found');
    }

    const updatedNote = { ...notes[noteIndex], ...updates };
    notes[noteIndex] = updatedNote;

    return { success: true, data: updatedNote };
  }

  async deleteContactNote(contactId: string, noteId: string): Promise<GHLApiResponse<{ succeded: boolean }>> {
    await this.applyLatency();
    this.checkErrorTrigger(noteId);

    const notes = this.notes.get(contactId) || [];
    const filtered = notes.filter(n => n.id !== noteId);

    if (filtered.length === notes.length) {
      throw createApiError(404, 'Note not found');
    }

    this.notes.set(contactId, filtered);

    return { success: true, data: { succeded: true } };
  }

  // ==========================================================================
  // CONVERSATION METHODS
  // ==========================================================================

  async sendSMS(contactId: string, message: string, _fromNumber?: string): Promise<GHLApiResponse<any>> {
    await this.applyLatency();
    this.checkErrorTrigger(contactId);

    const errors = this.validateInput([
      () => validators.required(message, 'message')
    ]);

    if (errors.length > 0) {
      return {
        success: false,
        error: { message: errors.join('; '), statusCode: 400, details: errors }
      };
    }

    const messageId = generateId('msg');
    const conversationId = generateId('conv');

    // Create/update conversation
    const conversation: GHLConversation = {
      ...mockConversation,
      id: conversationId,
      contactId,
      lastMessageBody: message,
      lastMessageType: 'TYPE_SMS'
    };
    this.conversations.set(conversationId, conversation);

    // Store message
    const newMessage: GHLMessage = {
      ...mockMessage,
      id: messageId,
      contactId,
      conversationId,
      body: message,
      direction: 'outbound',
      dateAdded: new Date().toISOString()
    };

    const existingMessages = this.messages.get(conversationId) || [];
    this.messages.set(conversationId, [...existingMessages, newMessage]);

    return {
      success: true,
      data: { messageId, conversationId }
    };
  }

  async sendEmail(contactId: string, subject: string, message?: string, html?: string, _options?: any): Promise<GHLApiResponse<any>> {
    await this.applyLatency();
    this.checkErrorTrigger(contactId);

    const errors = this.validateInput([
      () => validators.required(subject, 'subject'),
      () => !message && !html ? 'Either message or html is required' : null
    ]);

    if (errors.length > 0) {
      return {
        success: false,
        error: { message: errors.join('; '), statusCode: 400, details: errors }
      };
    }

    const messageId = generateId('msg');
    const conversationId = generateId('conv');
    const emailMessageId = generateId('email');

    return {
      success: true,
      data: { messageId, conversationId, emailMessageId }
    };
  }

  async searchConversations(searchParams: any): Promise<GHLApiResponse<any>> {
    await this.applyLatency();

    let conversations = Array.from(this.conversations.values());

    if (searchParams.contactId) {
      conversations = conversations.filter(c => c.contactId === searchParams.contactId);
    }

    if (searchParams.status === 'unread') {
      conversations = conversations.filter(c => c.unreadCount > 0);
    } else if (searchParams.status === 'starred') {
      conversations = conversations.filter(c => c.starred);
    }

    const limit = searchParams.limit || 25;

    return {
      success: true,
      data: {
        conversations: conversations.slice(0, limit),
        total: conversations.length
      }
    };
  }

  async getConversation(conversationId: string): Promise<GHLApiResponse<GHLConversation>> {
    await this.applyLatency();
    this.checkErrorTrigger(conversationId);

    const conversation = this.conversations.get(conversationId);
    if (!conversation) {
      throw createApiError(404, 'Conversation not found');
    }

    return { success: true, data: conversation };
  }

  async createConversation(conversationData: any): Promise<GHLApiResponse<any>> {
    await this.applyLatency();
    this.checkErrorTrigger(conversationData.contactId);

    const id = generateId('conv');
    const conversation: GHLConversation = {
      ...mockConversation,
      id,
      contactId: conversationData.contactId,
      locationId: this.config.locationId
    };

    this.conversations.set(id, conversation);

    return {
      success: true,
      data: {
        id,
        dateUpdated: new Date().toISOString(),
        dateAdded: new Date().toISOString(),
        deleted: false,
        contactId: conversationData.contactId,
        locationId: this.config.locationId,
        lastMessageDate: new Date().toISOString()
      }
    };
  }

  async updateConversation(conversationId: string, updates: any): Promise<GHLApiResponse<GHLConversation>> {
    await this.applyLatency();
    this.checkErrorTrigger(conversationId);

    const conversation = this.conversations.get(conversationId);
    if (!conversation) {
      throw createApiError(404, 'Conversation not found');
    }

    const updated = { ...conversation, ...updates };
    this.conversations.set(conversationId, updated);

    return { success: true, data: updated };
  }

  async getConversationMessages(conversationId: string, _options?: any): Promise<GHLApiResponse<any>> {
    await this.applyLatency();
    this.checkErrorTrigger(conversationId);

    const messages = this.messages.get(conversationId) || [];

    return {
      success: true,
      data: {
        lastMessageId: messages[messages.length - 1]?.id || null,
        nextPage: false,
        messages
      }
    };
  }

  // ==========================================================================
  // OPPORTUNITY METHODS
  // ==========================================================================

  async searchOpportunities(searchParams: any): Promise<GHLApiResponse<any>> {
    await this.applyLatency();

    let opportunities = Array.from(this.opportunities.values());

    if (searchParams.pipelineId) {
      opportunities = opportunities.filter(o => o.pipelineId === searchParams.pipelineId);
    }

    if (searchParams.stageId) {
      opportunities = opportunities.filter(o => o.pipelineStageId === searchParams.stageId);
    }

    if (searchParams.status && searchParams.status !== 'all') {
      opportunities = opportunities.filter(o => o.status === searchParams.status);
    }

    if (searchParams.contactId) {
      opportunities = opportunities.filter(o => o.contact?.id === searchParams.contactId);
    }

    const limit = searchParams.limit || 25;

    return {
      success: true,
      data: {
        opportunities: opportunities.slice(0, limit),
        meta: {
          total: opportunities.length,
          currentPage: 1,
          nextPage: null,
          prevPage: null
        }
      }
    };
  }

  async getOpportunity(opportunityId: string): Promise<GHLApiResponse<GHLOpportunity>> {
    await this.applyLatency();
    this.checkErrorTrigger(opportunityId);

    const opportunity = this.opportunities.get(opportunityId);
    if (!opportunity) {
      throw createApiError(404, 'Opportunity not found');
    }

    return { success: true, data: opportunity };
  }

  async createOpportunity(opportunityData: any): Promise<GHLApiResponse<GHLOpportunity>> {
    await this.applyLatency();

    const errors = this.validateInput([
      () => validators.required(opportunityData.name, 'name'),
      () => validators.required(opportunityData.pipelineId, 'pipelineId'),
      () => validators.required(opportunityData.pipelineStageId, 'pipelineStageId')
    ]);

    if (errors.length > 0) {
      return {
        success: false,
        error: { message: errors.join('; '), statusCode: 400, details: errors }
      };
    }

    const id = generateId('opp');
    const opportunity: GHLOpportunity = {
      ...mockOpportunity,
      ...opportunityData,
      id,
      locationId: this.config.locationId,
      status: opportunityData.status || 'open',
      dateAdded: new Date().toISOString(),
      lastStatusChangeAt: new Date().toISOString()
    };

    this.opportunities.set(id, opportunity);

    return { success: true, data: opportunity };
  }

  async updateOpportunity(opportunityId: string, updates: any): Promise<GHLApiResponse<GHLOpportunity>> {
    await this.applyLatency();
    this.checkErrorTrigger(opportunityId);

    const opportunity = this.opportunities.get(opportunityId);
    if (!opportunity) {
      throw createApiError(404, 'Opportunity not found');
    }

    const wasStatusChanged = updates.status && updates.status !== opportunity.status;
    const updated: GHLOpportunity = {
      ...opportunity,
      ...updates,
      lastStatusChangeAt: wasStatusChanged ? new Date().toISOString() : opportunity.lastStatusChangeAt
    };

    this.opportunities.set(opportunityId, updated);

    return { success: true, data: updated };
  }

  async updateOpportunityStatus(opportunityId: string, status: string): Promise<GHLApiResponse<{ succeded: boolean }>> {
    await this.applyLatency();
    this.checkErrorTrigger(opportunityId);

    const opportunity = this.opportunities.get(opportunityId);
    if (!opportunity) {
      throw createApiError(404, 'Opportunity not found');
    }

    opportunity.status = status as any;
    opportunity.lastStatusChangeAt = new Date().toISOString();

    return { success: true, data: { succeded: true } };
  }

  async deleteOpportunity(opportunityId: string): Promise<GHLApiResponse<{ succeded: boolean }>> {
    await this.applyLatency();
    this.checkErrorTrigger(opportunityId);

    if (!this.opportunities.has(opportunityId)) {
      throw createApiError(404, 'Opportunity not found');
    }

    this.opportunities.delete(opportunityId);

    return { success: true, data: { succeded: true } };
  }

  async getPipelines(_locationId?: string): Promise<GHLApiResponse<any>> {
    await this.applyLatency();

    const pipelines = Array.from(this.pipelines.values());

    return {
      success: true,
      data: { pipelines }
    };
  }

  // ==========================================================================
  // CALENDAR METHODS
  // ==========================================================================

  async getCalendars(_params?: any): Promise<GHLApiResponse<any>> {
    await this.applyLatency();

    const calendars = Array.from(this.calendars.values());

    return {
      success: true,
      data: { calendars }
    };
  }

  async getCalendar(calendarId: string): Promise<GHLApiResponse<any>> {
    await this.applyLatency();
    this.checkErrorTrigger(calendarId);

    const calendar = this.calendars.get(calendarId);
    if (!calendar) {
      throw createApiError(404, 'Calendar not found');
    }

    return { success: true, data: { calendar } };
  }

  async createAppointment(appointmentData: any): Promise<GHLApiResponse<GHLCalendarEvent>> {
    await this.applyLatency();

    const errors = this.validateInput([
      () => validators.required(appointmentData.calendarId, 'calendarId'),
      () => validators.required(appointmentData.startTime, 'startTime'),
      () => validators.required(appointmentData.endTime, 'endTime')
    ]);

    if (errors.length > 0) {
      return {
        success: false,
        error: { message: errors.join('; '), statusCode: 400, details: errors }
      };
    }

    const id = generateId('apt');
    const appointment: GHLCalendarEvent = {
      ...mockCalendarEvent,
      ...appointmentData,
      id,
      locationId: this.config.locationId,
      dateAdded: new Date().toISOString(),
      dateUpdated: new Date().toISOString()
    };

    this.appointments.set(id, appointment);

    return { success: true, data: appointment };
  }

  async getAppointment(appointmentId: string): Promise<GHLApiResponse<any>> {
    await this.applyLatency();
    this.checkErrorTrigger(appointmentId);

    const appointment = this.appointments.get(appointmentId);
    if (!appointment) {
      throw createApiError(404, 'Appointment not found');
    }

    return { success: true, data: { event: appointment } };
  }

  async updateAppointment(appointmentId: string, updates: any): Promise<GHLApiResponse<GHLCalendarEvent>> {
    await this.applyLatency();
    this.checkErrorTrigger(appointmentId);

    const appointment = this.appointments.get(appointmentId);
    if (!appointment) {
      throw createApiError(404, 'Appointment not found');
    }

    const updated: GHLCalendarEvent = {
      ...appointment,
      ...updates,
      dateUpdated: new Date().toISOString()
    };

    this.appointments.set(appointmentId, updated);

    return { success: true, data: updated };
  }

  async deleteAppointment(appointmentId: string): Promise<GHLApiResponse<{ succeeded: boolean }>> {
    await this.applyLatency();
    this.checkErrorTrigger(appointmentId);

    if (!this.appointments.has(appointmentId)) {
      throw createApiError(404, 'Appointment not found');
    }

    this.appointments.delete(appointmentId);

    return { success: true, data: { succeeded: true } };
  }

  async getContactAppointments(contactId: string): Promise<GHLApiResponse<GHLAppointment[]>> {
    await this.applyLatency();
    this.checkErrorTrigger(contactId);

    const appointments = Array.from(this.appointments.values())
      .filter(a => a.contactId === contactId)
      .map(e => ({
        ...mockAppointment,
        id: e.id,
        calendarId: e.calendarId,
        contactId: e.contactId!,
        startTime: e.startTime,
        endTime: e.endTime
      }));

    return { success: true, data: appointments };
  }

  // ==========================================================================
  // BLOG METHODS
  // ==========================================================================

  async createBlogPost(postData: any): Promise<GHLApiResponse<any>> {
    await this.applyLatency();

    const id = generateId('post');
    const post: GHLBlogPost = {
      ...mockBlogPost,
      ...postData,
      _id: id,
      publishedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.blogPosts.set(id, post);

    return { success: true, data: { data: post } };
  }

  async updateBlogPost(postId: string, postData: any): Promise<GHLApiResponse<any>> {
    await this.applyLatency();
    this.checkErrorTrigger(postId);

    const post = this.blogPosts.get(postId);
    if (!post) {
      throw createApiError(404, 'Blog post not found');
    }

    const updated = { ...post, ...postData, _id: postId, updatedAt: new Date().toISOString() };
    this.blogPosts.set(postId, updated);

    return { success: true, data: { updatedBlogPost: updated } };
  }

  async getBlogPosts(_params: any): Promise<GHLApiResponse<any>> {
    await this.applyLatency();

    const posts = Array.from(this.blogPosts.values());

    return { success: true, data: { blogs: posts } };
  }

  async getBlogSites(_params: any): Promise<GHLApiResponse<any>> {
    await this.applyLatency();
    return { success: true, data: { data: [mockBlogSite] } };
  }

  async getBlogAuthors(_params: any): Promise<GHLApiResponse<any>> {
    await this.applyLatency();
    return { success: true, data: { authors: [mockBlogAuthor] } };
  }

  async getBlogCategories(_params: any): Promise<GHLApiResponse<any>> {
    await this.applyLatency();
    return { success: true, data: { categories: [mockBlogCategory] } };
  }

  async checkUrlSlugExists(params: any): Promise<GHLApiResponse<any>> {
    await this.applyLatency();

    const posts = Array.from(this.blogPosts.values());
    const exists = posts.some(p => p.urlSlug === params.urlSlug);

    return { success: true, data: { exists } };
  }

  // ==========================================================================
  // UTILITY METHODS
  // ==========================================================================

  async testConnection(): Promise<GHLApiResponse<any>> {
    await this.applyLatency();

    if (this.config.accessToken === 'invalid_token') {
      throw createApiError(401, 'Invalid access token');
    }

    return {
      success: true,
      data: {
        status: 'connected',
        locationId: this.config.locationId
      }
    };
  }

  updateAccessToken(newToken: string): void {
    this.config.accessToken = newToken;
  }

  // ==========================================================================
  // STATE ACCESS (for testing assertions)
  // ==========================================================================

  /** Get all stored contacts */
  getStoredContacts(): GHLContact[] {
    return Array.from(this.contacts.values());
  }

  /** Get all stored opportunities */
  getStoredOpportunities(): GHLOpportunity[] {
    return Array.from(this.opportunities.values());
  }

  /** Get all stored conversations */
  getStoredConversations(): GHLConversation[] {
    return Array.from(this.conversations.values());
  }

  /** Get all stored appointments */
  getStoredAppointments(): GHLCalendarEvent[] {
    return Array.from(this.appointments.values());
  }

  /** Seed specific fixtures into state */
  seedContacts(contacts: GHLContact[]): void {
    contacts.forEach(c => this.contacts.set(c.id!, c));
  }

  seedOpportunities(opportunities: GHLOpportunity[]): void {
    opportunities.forEach(o => this.opportunities.set(o.id, o));
  }
}

// ============================================================================
// SECTION 6: MOCK EXECUTOR FACTORY (for pipeline/batch tests)
// ============================================================================

/**
 * Result type for mock executor
 */
export interface MockExecutorResult {
  success: boolean;
  result?: unknown;
  error?: string;
  validationErrors?: string[];
}

/**
 * Tool executor function type
 */
export type MockToolExecutor = (
  toolName: string,
  args: Record<string, unknown>
) => Promise<MockExecutorResult>;

/**
 * Configuration for mock executor
 */
export interface MockExecutorConfig {
  /** Static results per tool name */
  results?: Record<string, unknown | ((args: Record<string, unknown>) => unknown)>;
  /** Default delay in ms */
  delayMs?: number;
  /** Per-tool delays */
  toolDelays?: Record<string, number>;
  /** Tools that should fail */
  failingTools?: string[];
  /** Custom error messages per tool */
  errorMessages?: Record<string, string>;
}

/**
 * Create a mock executor for pipeline/batch testing
 *
 * @example
 * // Basic usage with static results
 * const executor = createMockExecutor({
 *   results: {
 *     search_contacts: [{ id: 'c1', name: 'John' }],
 *     get_contact: (args) => ({ id: args.contactId, email: 'test@example.com' })
 *   }
 * });
 *
 * @example
 * // With failures
 * const executor = createMockExecutor({
 *   results: { search: [] },
 *   failingTools: ['send_sms'],
 *   errorMessages: { send_sms: 'SMS service unavailable' }
 * });
 */
export function createMockExecutor(config: MockExecutorConfig = {}): MockToolExecutor {
  const {
    results = {},
    delayMs = 0,
    toolDelays = {},
    failingTools = [],
    errorMessages = {}
  } = config;

  return async (toolName: string, args: Record<string, unknown>): Promise<MockExecutorResult> => {
    // Apply delay
    const delay = toolDelays[toolName] ?? delayMs;
    if (delay > 0) {
      await sleep(delay);
    }

    // Check for explicit failures
    if (failingTools.includes(toolName)) {
      return {
        success: false,
        error: errorMessages[toolName] || `Tool ${toolName} failed`
      };
    }

    // Check for fail_ prefix pattern
    if (toolName.startsWith('fail_')) {
      return {
        success: false,
        error: `Tool ${toolName} failed`,
        validationErrors: ['Missing required param']
      };
    }

    // Get result
    const result = results[toolName];

    if (result === undefined) {
      return {
        success: false,
        error: `Unknown tool: ${toolName}`
      };
    }

    // If result is a function, call it with args
    if (typeof result === 'function') {
      return { success: true, result: result(args) };
    }

    return { success: true, result };
  };
}

/**
 * Create a mock executor backed by MockGHLApiClientV2
 * Maps tool names to client methods automatically
 */
export function createStatefulMockExecutor(client: MockGHLApiClientV2): MockToolExecutor {
  const toolMap: Record<string, (args: any) => Promise<any>> = {
    // Contact tools
    'create_contact': (args) => client.createContact(args),
    'get_contact': (args) => client.getContact(args.contactId),
    'update_contact': (args) => client.updateContact(args.contactId, args),
    'delete_contact': (args) => client.deleteContact(args.contactId),
    'search_contacts': (args) => client.searchContacts(args),
    'add_contact_tags': (args) => client.addContactTags(args.contactId, args.tags),
    'remove_contact_tags': (args) => client.removeContactTags(args.contactId, args.tags),

    // Task tools
    'get_contact_tasks': (args) => client.getContactTasks(args.contactId),
    'create_contact_task': (args) => client.createContactTask(args.contactId, args),
    'update_contact_task': (args) => client.updateContactTask(args.contactId, args.taskId, args),
    'delete_contact_task': (args) => client.deleteContactTask(args.contactId, args.taskId),

    // Note tools
    'get_contact_notes': (args) => client.getContactNotes(args.contactId),
    'create_contact_note': (args) => client.createContactNote(args.contactId, args),
    'update_contact_note': (args) => client.updateContactNote(args.contactId, args.noteId, args),
    'delete_contact_note': (args) => client.deleteContactNote(args.contactId, args.noteId),

    // Conversation tools
    'send_sms': (args) => client.sendSMS(args.contactId, args.message, args.fromNumber),
    'send_email': (args) => client.sendEmail(args.contactId, args.subject, args.message, args.html),
    'search_conversations': (args) => client.searchConversations(args),
    'get_conversation': (args) => client.getConversation(args.conversationId),
    'get_conversation_messages': (args) => client.getConversationMessages(args.conversationId, args),

    // Opportunity tools
    'search_opportunities': (args) => client.searchOpportunities(args),
    'get_opportunity': (args) => client.getOpportunity(args.opportunityId),
    'create_opportunity': (args) => client.createOpportunity(args),
    'update_opportunity': (args) => client.updateOpportunity(args.opportunityId, args),
    'delete_opportunity': (args) => client.deleteOpportunity(args.opportunityId),
    'get_pipelines': (args) => client.getPipelines(args?.locationId),

    // Calendar tools
    'get_calendars': (args) => client.getCalendars(args),
    'get_calendar': (args) => client.getCalendar(args.calendarId),
    'create_appointment': (args) => client.createAppointment(args),
    'get_appointment': (args) => client.getAppointment(args.appointmentId),
    'update_appointment': (args) => client.updateAppointment(args.appointmentId, args),
    'delete_appointment': (args) => client.deleteAppointment(args.appointmentId),
    'get_contact_appointments': (args) => client.getContactAppointments(args.contactId)
  };

  return async (toolName: string, args: Record<string, unknown>): Promise<MockExecutorResult> => {
    const handler = toolMap[toolName];

    if (!handler) {
      return {
        success: false,
        error: `Unknown tool: ${toolName}`
      };
    }

    try {
      const response = await handler(args);

      if (response.success === false) {
        return {
          success: false,
          error: response.error?.message || 'Unknown error',
          validationErrors: response.error?.details
        };
      }

      return { success: true, result: response.data };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  };
}

// ============================================================================
// SECTION 7: BACKWARDS COMPATIBILITY
// ============================================================================

/**
 * Alias for backwards compatibility with existing tests
 */
export const MockGHLApiClient = MockGHLApiClientV2;
