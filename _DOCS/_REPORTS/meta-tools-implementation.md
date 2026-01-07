# Meta-Tools Implementation Report

## Overview

This document describes the implementation of meta-tools in the GHL MCP Server that reduce context pollution and enable efficient server-side processing of complex workflows.

## Implemented Features

### 1. execute_tool with Options (Phase 1)

Enhanced tool execution with result transformation options.

**Options:**
- `select_fields`: Project specific fields from results
- `filter`: Filter results using expressions
- `limit`: Limit array results
- `return_mode`: Control result format (inline/summary/file)
- `file_path`: Custom file path for file mode (Phase 4)

**Usage Example:**
```javascript
execute_tool({
  tool_name: "search_contacts",
  args: { query: "john" },
  options: {
    select_fields: ["id", "firstName", "email"],
    filter: "email CONTAINS @gmail.com",
    limit: 10,
    return_mode: "summary"
  }
})
```

**Filter Operators:**
- `=`, `!=`, `>`, `<`
- `CONTAINS`, `STARTS_WITH`
- `IS_NULL`, `IS_NOT_NULL`

### 2. execute_pipeline (Phase 2 + Phase 4 Loop Support)

Multi-step workflow execution with variable passing between steps.

**Features:**
- Sequential step execution
- Variable interpolation: `{{step_id.field}}`
- Loop support: Iterate over arrays with `{{item}}` syntax
- Filter support: Skip items conditionally
- Parallel loop execution with configurable concurrency
- Return template for selecting final output

**Basic Pipeline Example:**
```javascript
execute_pipeline({
  steps: [
    {
      id: "search",
      tool_name: "search_contacts",
      args: { query: "vip" }
    },
    {
      id: "send",
      tool_name: "send_sms",
      args: {
        contactId: "{{search.contacts[0].id}}",
        message: "Hello {{search.contacts[0].firstName}}!"
      }
    }
  ]
})
```

**Pipeline with Loops (Phase 4):**
```javascript
execute_pipeline({
  steps: [
    {
      id: "contacts",
      tool_name: "search_contacts",
      args: { query: "active" }
    },
    {
      id: "conversations",
      tool_name: "search_conversations",
      args: { contactId: "{{item.id}}" },
      loop: "{{contacts.contacts}}",  // Iterate over contacts
      concurrency: 5                   // Parallel execution
    },
    {
      id: "messages",
      tool_name: "get_last_message",
      args: { conversationId: "{{item.id}}" },
      loop: "{{conversations}}",
      filter: "{{item.conversations}}"  // Skip empty conversation arrays
    }
  ]
})
```

**Loop Properties:**
- `loop`: Variable reference to array (`{{step_id.array}}`)
- `filter`: Condition to skip items (truthy values pass)
- `concurrency`: Parallel executions (default: 5, max: 10)
- `{{item}}`: Current item in iteration
- `{{index}}`: Current index in iteration

### 3. execute_batch (Phase 3)

Bulk operations with rate limiting and parallel processing.

**Features:**
- Configurable concurrency (max: 10)
- Rate limiting (100 req/min for GHL API)
- Error handling: continue or stop modes
- Result modes: summary or detail
- Field projection for detail mode
- Retry support with exponential backoff

**Usage Example:**
```javascript
execute_batch({
  tool_name: "update_contact",
  items: [
    { contactId: "c1", tags: ["vip"] },
    { contactId: "c2", tags: ["vip"] },
    { contactId: "c3", tags: ["vip"] }
  ],
  options: {
    concurrency: 5,
    on_error: "continue",
    result_mode: "summary"
  }
})

// Returns:
{
  success: true,
  data: {
    total: 3,
    succeeded: 3,
    failed: 0,
    duration_ms: 245
  }
}
```

### 4. Custom File Path (Phase 4)

Added ability to specify custom file paths for `return_mode: "file"`.

**Usage:**
```javascript
execute_tool({
  tool_name: "search_contacts",
  args: { query: "all" },
  options: {
    return_mode: "file",
    file_path: "/path/to/output/contacts.json"  // Custom path
  }
})
```

## Architecture

### File Structure
```
src/execution/
├── field-projector.ts    # Field selection with dot notation
├── result-filter.ts      # Filter expression parsing and evaluation
├── variable-resolver.ts  # Template variable resolution
├── return-modes.ts       # Return mode transformations
├── rate-limiter.ts       # Token bucket rate limiting
├── pipeline-executor.ts  # Multi-step workflow execution + loops
└── batch-executor.ts     # Bulk operations with concurrency
```

### Key Patterns

1. **Variable Resolution**: `{{step_id.path}}` syntax for referencing previous step results
2. **Field Projection**: Dot notation and array indexing (`contact.email`, `tags[0]`)
3. **Rate Limiting**: Token bucket algorithm respecting GHL API limits
4. **Parallel Execution**: Batched processing with configurable concurrency

## Test Coverage

| Module | Lines | Branches | Functions |
|--------|-------|----------|-----------|
| field-projector.ts | 100% | 97.72% | 100% |
| result-filter.ts | 100% | 100% | 100% |
| variable-resolver.ts | 100% | 100% | 100% |
| pipeline-executor.ts | 90%+ | 85%+ | 100% |
| batch-executor.ts | 90%+ | 85%+ | 100% |

## Migration Guide

### From basic execute_tool

**Before (high token usage):**
```javascript
// Call 1: Get all contacts
const contacts = await search_contacts({ query: "vip" });
// All contact data returned to LLM

// Call 2: Process in LLM
// ... LLM processes the full response

// Call 3: Send SMS
await send_sms({ contactId: contacts[0].id, message: "..." });
```

**After (minimal token usage):**
```javascript
// Single call - server-side processing
execute_pipeline({
  steps: [
    {
      id: "search",
      tool_name: "search_contacts",
      args: { query: "vip" }
    },
    {
      id: "notify",
      tool_name: "send_sms",
      args: {
        contactId: "{{search.contacts[0].id}}",
        message: "Hello {{search.contacts[0].firstName}}!"
      },
      loop: "{{search.contacts}}",
      filter: "{{item.phone}}"  // Only contacts with phone
    }
  ],
  return: {
    notify: ["message_id"]  // Only return message IDs
  }
})
```

## Best Practices

1. **Use loops instead of manual indexing**: Loops handle variable-length arrays
2. **Apply filters early**: Skip processing items that don't meet criteria
3. **Use return templates**: Only return the data you need
4. **Batch similar operations**: Use execute_batch for bulk updates
5. **Set appropriate concurrency**: Balance speed vs. rate limits

## Limitations

- Maximum 20 steps per pipeline
- Maximum 100 items per batch
- Maximum 100 loop iterations per step
- Pipeline timeout: 5 minutes max
- Batch timeout: 5 minutes max

---

*Implementation completed: Phase 1-4 (January 2026)*
