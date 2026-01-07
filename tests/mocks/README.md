# GHL API Mock System

This directory contains mock implementations for testing the GHL MCP server without making real API calls.

## Files

| File | Description |
|------|-------------|
| `ghl-api-client.mock.ts` | Original mock (v1) - stateless, basic |
| `ghl-api-client.mock-2.ts` | Enhanced mock (v2) - stateful, comprehensive |

## Quick Start

```typescript
import {
  MockGHLApiClientV2,
  contactFixtures,
  createMockExecutor,
  createStatefulMockExecutor,
  ERROR_TRIGGER_IDS
} from './ghl-api-client.mock-2.js';

// Create client
const client = new MockGHLApiClientV2({
  latencyMs: 50,           // Simulate network delay
  enableErrorScenarios: true,
  enableValidation: true
});

// Use in tests
const result = await client.searchContacts({ query: 'John' });
```

## Mock v2 Features

### 1. State Management

The mock remembers created/updated/deleted entities across method calls:

```typescript
const client = new MockGHLApiClientV2();

// Create contact - stored in internal Map
const created = await client.createContact({ email: 'test@example.com' });

// Get it back - returns stored contact
const fetched = await client.getContact(created.data.id);

// Delete it
await client.deleteContact(created.data.id);

// Now throws 404
await client.getContact(created.data.id); // Error!
```

Supported entities: contacts, conversations, messages, tasks, notes, opportunities, pipelines, calendars, appointments, blogPosts.

### 2. Error Simulation

Trigger specific errors using magic IDs:

```typescript
import { ERROR_TRIGGER_IDS } from './ghl-api-client.mock-2.js';

// These IDs trigger errors when used:
await client.getContact('not_found');     // 404 Resource not found
await client.getContact('unauthorized');  // 401 Invalid token
await client.getContact('rate_limited');  // 429 Rate limit exceeded
await client.getContact('server_error');  // 500 Internal server error
await client.getContact('validation_error'); // 400 Validation failed
await client.getContact('timeout');       // 408 Request timeout
```

Disable error scenarios:
```typescript
const client = new MockGHLApiClientV2({ enableErrorScenarios: false });
```

### 3. Latency Simulation

Test timeout handling and async behavior:

```typescript
const client = new MockGHLApiClientV2({ latencyMs: 200 });

// Every method now takes ~200ms
const start = Date.now();
await client.searchContacts({});
console.log(Date.now() - start); // ~200
```

### 4. Input Validation

Validates required fields and returns proper error responses:

```typescript
// Missing email AND phone
const result = await client.createContact({ firstName: 'John' });
// result.success = false
// result.error.message = 'Either email or phone is required'

// Missing required task fields
const taskResult = await client.createContactTask('contact_123', {});
// result.error.details = ['title is required', 'dueDate is required']
```

Disable validation:
```typescript
const client = new MockGHLApiClientV2({ enableValidation: false });
```

### 5. Fixtures

Pre-built data sets for common test scenarios:

```typescript
import {
  contactFixtures,
  opportunityFixtures,
  conversationFixtures,
  messageFixtures
} from './ghl-api-client.mock-2.js';

// Empty array for edge cases
contactFixtures.empty  // []

// Single item
contactFixtures.single // [mockContact]

// Mixed states (active, inactive, no email, DND, etc.)
contactFixtures.mixed  // 5 contacts with various states

// Large dataset (100 items) for performance tests
contactFixtures.large

// Pagination testing (50 items)
contactFixtures.paginated

// Seed fixtures into client
client.seedContacts(contactFixtures.large);
client.seedOpportunities(opportunityFixtures.mixed);
```

### 6. Mock Executor Factory

For testing pipelines and batch operations:

#### Simple Executor (static results)

```typescript
import { createMockExecutor } from './ghl-api-client.mock-2.js';

const executor = createMockExecutor({
  results: {
    // Static result
    search_contacts: [{ id: 'c1', name: 'John' }],

    // Dynamic result based on args
    get_contact: (args) => ({
      id: args.contactId,
      email: 'test@example.com'
    })
  },
  delayMs: 10,  // Default delay
  toolDelays: { slow_operation: 100 },  // Per-tool delays
  failingTools: ['broken_tool'],
  errorMessages: { broken_tool: 'Service unavailable' }
});

// Use with pipeline executor
const result = await executePipeline({ steps: [...] }, executor);
```

#### Stateful Executor (backed by MockGHLApiClientV2)

```typescript
import {
  MockGHLApiClientV2,
  createStatefulMockExecutor
} from './ghl-api-client.mock-2.js';

const client = new MockGHLApiClientV2();
const executor = createStatefulMockExecutor(client);

// Tools map to client methods:
// 'create_contact' -> client.createContact()
// 'get_contact' -> client.getContact()
// 'search_opportunities' -> client.searchOpportunities()
// etc.

// Changes persist across calls
await executor('create_contact', { email: 'new@test.com' });
const contacts = client.getStoredContacts();
```

## API Reference

### MockGHLApiClientV2

#### Constructor Options

```typescript
interface MockConfig {
  latencyMs: number;           // Simulated delay (default: 0)
  enableErrorScenarios: boolean; // Error triggers active (default: true)
  enableValidation: boolean;   // Input validation active (default: true)
  accessToken: string;         // Simulated token (default: 'test_token')
  locationId: string;          // Location ID (default: 'test_location_123')
}
```

#### Methods

| Category | Methods |
|----------|---------|
| **Contacts** | `createContact`, `getContact`, `updateContact`, `deleteContact`, `searchContacts`, `addContactTags`, `removeContactTags` |
| **Tasks** | `getContactTasks`, `createContactTask`, `getContactTask`, `updateContactTask`, `deleteContactTask`, `updateTaskCompletion` |
| **Notes** | `getContactNotes`, `createContactNote`, `getContactNote`, `updateContactNote`, `deleteContactNote` |
| **Conversations** | `sendSMS`, `sendEmail`, `searchConversations`, `getConversation`, `createConversation`, `updateConversation`, `getConversationMessages` |
| **Opportunities** | `searchOpportunities`, `getOpportunity`, `createOpportunity`, `updateOpportunity`, `updateOpportunityStatus`, `deleteOpportunity`, `getPipelines` |
| **Calendar** | `getCalendars`, `getCalendar`, `createAppointment`, `getAppointment`, `updateAppointment`, `deleteAppointment`, `getContactAppointments` |
| **Blog** | `createBlogPost`, `updateBlogPost`, `getBlogPosts`, `getBlogSites`, `getBlogAuthors`, `getBlogCategories`, `checkUrlSlugExists` |
| **Utility** | `testConnection`, `updateAccessToken`, `reset`, `configure`, `getConfig` |
| **State Access** | `getStoredContacts`, `getStoredOpportunities`, `getStoredConversations`, `getStoredAppointments`, `seedContacts`, `seedOpportunities` |

## Examples

### Testing Error Handling

```typescript
describe('Error Handling', () => {
  const client = new MockGHLApiClientV2();

  it('handles 404 errors', async () => {
    await expect(client.getContact('not_found'))
      .rejects.toThrow('GHL API Error (404)');
  });

  it('handles rate limiting', async () => {
    await expect(client.getContact('rate_limited'))
      .rejects.toThrow('Rate limit exceeded');
  });
});
```

### Testing with Fixtures

```typescript
describe('Bulk Operations', () => {
  it('processes large contact list', async () => {
    const client = new MockGHLApiClientV2();
    client.seedContacts(contactFixtures.large);

    const result = await client.searchContacts({ limit: 100 });
    expect(result.data.contacts.length).toBe(100);
  });
});
```

### Testing Pipelines

```typescript
describe('Pipeline Execution', () => {
  it('executes search -> notify workflow', async () => {
    const executor = createMockExecutor({
      results: {
        search_contacts: [{ id: 'c1', phone: '+1234567890' }],
        send_sms: (args) => ({
          messageId: 'msg_123',
          sentTo: args.contactId
        })
      }
    });

    const result = await executePipeline({
      steps: [
        { id: 'search', tool_name: 'search_contacts', args: {} },
        { id: 'notify', tool_name: 'send_sms', args: {
          contactId: '{{search[0].id}}',
          message: 'Hello!'
        }}
      ]
    }, executor);

    expect(result.success).toBe(true);
  });
});
```

## Migration from v1 to v2

The v2 mock is backwards compatible. Simply change the import:

```typescript
// Before (v1)
import { MockGHLApiClient } from './ghl-api-client.mock.js';

// After (v2) - same class name exported
import { MockGHLApiClient } from './ghl-api-client.mock-2.js';

// Or use the explicit v2 name
import { MockGHLApiClientV2 } from './ghl-api-client.mock-2.js';
```

Key differences:
- v2 remembers state (create -> get works)
- v2 has error simulation
- v2 has latency simulation
- v2 validates input
- v2 includes fixtures and executor factories
