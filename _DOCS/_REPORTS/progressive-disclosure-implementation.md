# Progressive Disclosure Implementation Report

**Date:** 2026-01-07
**Branch:** `feat/grouped-tools`
**Status:** Implemented & Tested

---

## Executive Summary

Implemented a **Progressive Disclosure** pattern for the GoHighLevel MCP Server, reducing exposed tools from **254 to 5** (98% reduction), resulting in an estimated **96% reduction in token usage** per session.

---

## Problem Statement

### Before Implementation
- MCP server exposed **254 tools** with full JSON schemas
- Each tool schema averaged **500-1500 tokens**
- Total token load per session: **~150,000-300,000 tokens**
- Issues:
  - Context window pollution before any work begins
  - High API costs per session
  - Model "choice overload" leading to suboptimal tool selection
  - Slow initial connection due to large payload

### Industry Context
The MCP specification (2025-11-25) supports pagination but not server-side filtering. The community has converged on a "meta-tools" pattern (search → describe → execute) as the standard solution for large tool catalogs.

---

## Solution: Meta-Tools Pattern

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│              EXPOSED TO CLIENT (5 tools)                     │
├─────────────────────────────────────────────────────────────┤
│  META-TOOLS                                                  │
│  ├── search_tools     → Find tools by keyword/domain        │
│  ├── describe_tools   → Get full schema on-demand           │
│  ├── execute_tool     → Run any tool with validation        │
│  └── list_domains     → Overview of 19 categories           │
├─────────────────────────────────────────────────────────────┤
│  DIRECT ACCESS (high-use)                                    │
│  └── search_contacts  → Most frequently used tool           │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│           INTERNAL TOOL REGISTRY (254 tools)                 │
│  ├── Full JSON schemas stored & indexed                      │
│  ├── Text-based search with relevance scoring               │
│  ├── Domain/category metadata                                │
│  └── Adapter layer for heterogeneous tool classes           │
└─────────────────────────────────────────────────────────────┘
```

### Key Design Decisions

1. **Adapter Pattern for Tool Classes**
   - Existing tool classes had inconsistent interfaces (`getToolDefinitions()` vs `getTools()`, `executeTool()` vs `handleToolCall()` vs custom names)
   - Created runtime adapter that normalizes all interfaces
   - Zero changes required to existing tool implementations

2. **Search with Relevance Scoring**
   - Tokenizes tool names, descriptions, and domains
   - Calculates relevance score (0-1) based on term matching
   - Returns ranked results with summaries (not full schemas)

3. **On-Demand Schema Loading**
   - Full schemas only returned via `describe_tools`
   - Maximum 5 tools per describe call to prevent token explosion
   - Includes usage hints and examples

4. **Direct Tool Access**
   - `search_contacts` exposed directly (most-used tool)
   - Bypasses execute_tool proxy for better UX
   - Can add more direct tools if needed

---

## Files Created/Modified

### New Files

| File | Purpose |
|------|---------|
| `src/registry/types.ts` | TypeScript interfaces for registry |
| `src/registry/tool-registry.ts` | Central registry with search/describe/execute |
| `src/tools/meta-tools.ts` | 4 meta-tools implementation |

### Modified Files

| File | Changes |
|------|---------|
| `src/server.ts` | Complete rewrite to use registry + meta-tools |

### Unchanged Files

All 19 tool class files remain **completely unchanged**:
- `contact-tools.ts`, `conversation-tools.ts`, `calendar-tools.ts`, etc.
- The adapter pattern handles interface differences at runtime

---

## Token Impact Analysis

| Configuration | Tools Exposed | Est. Tokens | Savings |
|--------------|---------------|-------------|---------|
| **Before (all tools)** | 254 | ~200,000 | baseline |
| **After (meta-tools)** | 5 | ~8,000 | **96%** |

### Calculation Basis
- Average tool schema: ~800 tokens
- Meta-tool schemas: ~400 tokens each (simpler)
- search_contacts schema: ~300 tokens

---

## Usage Guide

### 1. Discover Available Domains

```
User: What capabilities does GHL have?

Claude uses: list_domains()

Response:
{
  "totalDomains": 19,
  "totalTools": 254,
  "domains": [
    { "name": "calendar", "toolCount": 39, "description": "Appointments, scheduling..." },
    { "name": "contacts", "toolCount": 31, "description": "Contact management..." },
    ...
  ]
}
```

### 2. Search for Specific Tools

```
User: I need to create a new contact

Claude uses: search_tools({ query: "create contact" })

Response:
{
  "results": [
    { "name": "create_contact", "domain": "contacts", "summary": "Create a new contact...", "requiredParams": ["email"] },
    { "name": "upsert_contact", "domain": "contacts", "summary": "Create or update contact...", "requiredParams": [] }
  ],
  "hint": "Use describe_tools(['create_contact']) to see full schema"
}
```

### 3. Get Full Schema Before Execution

```
Claude uses: describe_tools({ tool_names: ["create_contact"] })

Response:
{
  "tools": [{
    "name": "create_contact",
    "description": "Create a new contact in GoHighLevel",
    "inputSchema": {
      "type": "object",
      "properties": {
        "email": { "type": "string", "description": "Contact email address" },
        "firstName": { "type": "string", "description": "Contact first name" },
        ...
      },
      "required": ["email"]
    },
    "usage": "execute_tool({ tool_name: \"create_contact\", args: { email: \"...\" } })"
  }]
}
```

### 4. Execute the Tool

```
Claude uses: execute_tool({
  tool_name: "create_contact",
  args: {
    email: "john@example.com",
    firstName: "John",
    lastName: "Doe"
  }
})

Response:
{
  "success": true,
  "tool": "create_contact",
  "result": {
    "id": "abc123",
    "email": "john@example.com",
    ...
  }
}
```

### 5. Direct Access for Common Operations

```
User: Search for contacts named John

Claude uses: search_contacts({ query: "John" })
// Direct execution, no need for execute_tool wrapper
```

---

## Domain Reference

| Domain | Tools | Description |
|--------|-------|-------------|
| calendar | 39 | Appointments, scheduling, availability |
| contacts | 31 | Contact management, tasks, notes, tags |
| locations | 24 | Sub-accounts, settings, custom fields |
| conversations | 21 | SMS, email, messaging, calls |
| payments | 20 | Orders, transactions, coupons |
| invoices | 18 | Invoices, estimates, billing |
| store | 18 | Shipping zones, rates, carriers |
| social | 17 | Social media posts, accounts |
| opportunities | 10 | Sales pipeline, deals |
| associations | 10 | Entity relationships |
| products | 10 | Product catalog, pricing |
| objects | 9 | Custom objects, records |
| customfields | 8 | Custom field management v2 |
| blog | 7 | Blog posts, authors, categories |
| email | 5 | Email campaigns, templates |
| media | 3 | File uploads, media library |
| surveys | 2 | Surveys, submissions |
| workflows | 1 | Automation workflows |
| verification | 1 | Email verification |

---

## Rollback Plan

If issues arise:

1. **Git revert**: All changes are in a single branch
2. **Environment flag**: Could add `EXPOSE_ALL_TOOLS=true` to bypass progressive disclosure
3. **Tool classes unchanged**: Original functionality intact

---

## Future Enhancements

1. **Embedding-based search**: Replace text matching with semantic search
2. **Usage analytics**: Track which tools are most used, optimize direct access list
3. **Domain toggles**: Allow enabling/disabling domains via `enable_domain()` tool
4. **Caching**: Cache tool schemas for faster describe_tools responses

---

## References

- [MCP Specification 2025-11-25](https://modelcontextprotocol.io/specification/2025-11-25/server/tools)
- [Speakeasy Dynamic Toolsets](https://www.speakeasy.com/blog/how-we-reduced-token-usage-by-100x-dynamic-toolsets-v2)
- [MCP GitHub Issue #1308](https://github.com/modelcontextprotocol/modelcontextprotocol/issues/1308)

---

*Implementation completed 2026-01-07 on branch `feat/grouped-tools`*
