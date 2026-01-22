# Progressive disclosure / tool discovery patterns for large MCP tool catalogs (token-efficient)

**Context**: MCP server exposing ~254 GoHighLevel (GHL) CRM tools. Goal: reduce token usage by *not* exposing every tool (and full JSON Schemas) up-front, while still keeping reliability high.

> Date: 2026-01-07  
> Protocol baseline referenced: MCP spec **2025-11-25** (latest as of this report)

---

## Executive summary (what works best in practice)

Most teams converge on one of these **three** architectures:

1) **Split into multiple MCP servers by domain (simplest, most compatible)**
   - Example: `ghl-contacts`, `ghl-conversations`, `ghl-opportunities`, `ghl-calendars`, etc.
   - Users/clients enable only the server(s) they need for a session.
   - Best when you must support clients that insist on loading all tool schemas at connect time.

2) **Progressive discovery via “meta-tools” (search → describe → execute)**
   - Expose only 3–6 bootstrap tools such as:
     - `search_tools(query, category, limit, detail_level)`
     - `describe_tools(tool_names[])` (returns full schemas/examples only for selected tools)
     - `execute_tool(tool_name, args)` (or `meta_execute_tool`)
   - Internally routes to the full catalog.
   - Best token savings; works great when your client/agent loop can handle the extra steps.

3) **Umbrella tools (single high-level router tool)**
   - Expose one tool like `ghl.request({method, path, params, body})`
   - Or higher-level “workflow” tools (preferred): `ghl.create_lead_and_start_nurture(...)`
   - Lowest token footprint, but can reduce correctness unless you add strong guardrails and good “describe” support.

In 2024–2025 discussions and implementations, **(2) meta-tools** is the dominant “token optimization” pattern, often combined with **(1) splitting** for organization.

---

## 1) What does the MCP spec/Anthropic recommend for “many tools”?

### MCP spec (official)
The MCP specification does **not** define server-side filtering for `tools/list`, but it *does* provide:

- **Pagination** for `tools/list` via `cursor` and `nextCursor`
- A **list changed** notification (`notifications/tools/list_changed`) so a server can signal that tool availability changed and the client should re-fetch

In other words: the *protocol* supports *incremental listing*, but not “give me only tools matching X”.

### Anthropic guidance (practical)
Anthropic’s own engineering content and ecosystem examples emphasize:
- Keep schemas and descriptions concise.
- Prefer capability discovery patterns (meta-tools) when catalogs get large.
- Treat “describe only when needed” as a primary token-saving lever (because schemas dominate).

---

## 2) Is there a “tool_search” / “list_tools” meta-tool pattern?

**Not in the MCP spec**, but it’s a very common *community pattern*.

The de-facto standard naming (varies slightly) is:

- `search_tools` — semantic/keyword search over the tool catalog
- `describe_tools` — return full schema + examples for selected tool(s)
- `execute_tool` — run a selected tool by name (proxy executor)

Some variants:
- `list_capabilities`, `enable_capability`, `disable_capability`
- `get_tool_help(tool_name)` / `describe_tool(tool_name)`
- `meta_search_tools` / `meta_execute_tool` (StackOne)

---

## 3) Examples of grouped tools / hierarchical exposure

### A) Naming-based grouping (spec-supported)
MCP 2025-11-25 explicitly supports dots in tool names (e.g., `admin.tools.list`), enabling hierarchical naming:
- `ghl.contacts.search`
- `ghl.contacts.create`
- `ghl.conversations.send_message`
- `ghl.opportunities.move_stage`

This helps models and humans “see structure” even if the whole list is still large.

### B) Progressive disclosure (meta-tools)
Multiple public MCP servers and writeups demonstrate:
- Start with a small tool set (3–4 tools), keep everything else “internal analyzers” or “subtools”
- Provide `search_tools` to discover internal tools
- Provide `execute_tool` to call them

### C) Runtime enabling/disabling groups
Some servers expose “capability toggles”:
- The initial tool list is tiny
- The model calls `enable_capability("contacts")`
- Server sends `notifications/tools/list_changed`
- Client re-lists tools and now sees only that group (or adds it)

This works best when you control the client (or the client honors list_changed).

---

## 4) Trade-offs (grouped tools vs search discovery vs lazy loading)

### Grouped tools (all visible, but structured)
**Pros**
- Highest reliability: the model has full JSON schemas for everything.
- Great UX in clients with tool pickers.

**Cons**
- Still high token cost: 254 tools + schemas can overwhelm context.
- “Choice overload”: models may pick suboptimal tools.

**Best for**
- Small-ish catalogs (tens of tools)
- Strong client UX and ample context window

---

### Search-based discovery (meta-tools)
**Pros**
- Massive token savings (only a few tool schemas visible).
- Better tool selection with semantic search + short summaries.
- Scales to hundreds/thousands of tools.

**Cons**
- More “chatty” loops: search → describe → execute.
- Harder to benefit from strict structured-arguments enforcement, because `execute_tool(args)` is usually “any object”.
- You must build good ranking, summaries, and schema retrieval.

**Best for**
- Very large catalogs (your situation)
- Agentic workflows where extra tool calls are acceptable

---

### Lazy loading via `tools/list` pagination / list_changed
**Pros**
- Stays “within protocol” and keeps individual tool calls structured.
- Lets you reduce initial payload size if the client only fetches the first page(s).

**Cons**
- Many clients will eagerly fetch *all pages* anyway.
- No server-side filtering in spec → the client still needs logic.

**Best for**
- Controlled clients, or where the client respects pagination boundaries

---

### Umbrella router tool (“one tool to rule them all”)
**Pros**
- Minimal token footprint (1–3 tools total).
- Easy to extend without changing the exposed tool set.

**Cons**
- The model must craft request payloads correctly.
- You lose per-operation schemas unless you add a describe step.
- Security: you must enforce allowlists, input validation, and permission checks.

**Best for**
- Mature systems with strong internal validation
- When tool count must be tiny (e.g., desktop clients with strict limits)

---

## 5) MCP protocol updates supporting filtering/pagination

As of the **2025-11-25** spec:
- `tools/list` supports **pagination** (`cursor`, `nextCursor`).
- There is still **no standardized filter/query parameter** for server-side tool filtering.
- There is a **list changed** notification to refresh tool availability.

---

## 6) How do “large” MCP implementations handle it?

Observed strategies in widely discussed implementations:
- **Keep tool counts moderate** (tens), using higher-level actions rather than exposing every API endpoint.
- **Meta-tools + dynamic toolsets** for large catalogs (search/describe/execute).
- **Client-side filtering** is also common in agent frameworks:
  - Example: Google ADK’s `McpToolset` supports an optional `tool_filter` to expose only a subset of tools from an MCP server (client chooses what to show).

---

## 7) Umbrella tools that route to sub-tools (patterns)

### Pattern 7.1 — “execute_tool” proxy (general)
Expose:
- `execute_tool(tool_name: string, args: object)`

Internally:
- Validate `tool_name` is allowed
- Validate `args` against the stored JSON Schema for that tool
- Execute the actual implementation
- Return structured output + short textual summary

### Pattern 7.2 — HTTP router (API-like)
Expose:
- `ghl.request({method, path, query, body})`

Guardrails:
- Allowlist paths and verbs
- Enforce auth scopes/tenant isolation
- Provide `describe_endpoint(path)` to return schema/examples

### Pattern 7.3 — Workflow umbrella (recommended for CRM)
Expose high-leverage composite operations:
- `ghl.create_lead({name, phone, source, tags})`
- `ghl.start_workflow({contact_id, workflow_id})`
- `ghl.book_appointment({calendar_id, contact_id, slot})`

This reduces tools while *improving* correctness because the model fills fewer parameters.

---

## A recommended blueprint for your 254-tool GoHighLevel MCP server

### Step 1 — Introduce domains + naming
Even if you keep the full list somewhere, ensure every tool has a consistent dotted namespace:
- `ghl.contacts.*`
- `ghl.conversations.*`
- `ghl.opportunities.*`
- `ghl.calendars.*`
- `ghl.workflows.*`
- `ghl.locations.*`

### Step 2 — Choose an exposure mode (pick one primary)
**If you need maximum compatibility (e.g., Claude Desktop today):**
- Split into multiple MCP servers by domain.
- Keep each to ~20–60 tools max.

**If you control the client/agent loop:**
- Switch to meta-tools:
  - `search_tools`
  - `describe_tools`
  - `execute_tool`

### Step 3 — Add “capability toggles” + list_changed (optional but powerful)
Expose:
- `enable_capability(domain)`
- `disable_capability(domain)`
- `list_capabilities()`

When toggled:
- server emits `notifications/tools/list_changed`
- client re-fetches tools
- only enabled domains appear

### Step 4 — Keep schemas small, move “docs” out of schemas
- Use short `description` fields (1–2 lines).
- Avoid embedding long examples in schema descriptions.
- Put longer docs in **resources** (e.g., `mcp://docs/tools/ghl.contacts.create`) and return them via `describe_tools` or resource links.

### Step 5 — Ranking and summaries (what makes search_tools work)
`search_tools` should return, for each match:
- tool name
- 1-line summary (task-oriented)
- “required inputs” quick view (not full schema)
- tags/domains
- confidence score / rank (optional)

### Step 6 — Hard validation
If you use `execute_tool`, validate args against the tool’s JSON Schema and return:
- clear error messages for self-correction
- hints about missing/invalid fields

---

## Implementation sketch (pseudo-interfaces)

### Minimal meta-tool set (recommended)

- search_tools(query: string, domain?: string, limit?: int = 8, detail_level?: "names"|"summary"|"full" = "summary")
- describe_tools(tool_names: string[], include_examples?: bool = true)
- execute_tool(tool_name: string, args: object)

### Optional toggles
- list_capabilities()
- enable_capability(name)
- disable_capability(name)

---

## References (primary sources)

- MCP Specification 2025-11-25 — Tools (pagination, list_changed, tool naming):  
  https://modelcontextprotocol.io/specification/2025-11-25/server/tools
- MCP Specification 2025-11-25 — Key changes (context for recent protocol updates):  
  https://modelcontextprotocol.io/specification/2025-11-25/changelog
- MCP GitHub issue discussing tool schema token explosion + describeTool workaround (#1308):  
  https://github.com/modelcontextprotocol/modelcontextprotocol/issues/1308
- Speakeasy — Dynamic Toolsets v2 / token reduction (search/describe/execute pattern):  
  https://www.speakeasy.com/blog/how-we-reduced-token-usage-by-100x-dynamic-toolsets-v2  
  https://www.speakeasy.com/blog/100x-token-reduction-dynamic-toolsets
- Anthropic Engineering — “Code execution with MCP” (efficiency patterns, discovery):  
  https://www.anthropic.com/engineering/code-execution-with-mcp
- Google ADK — MCP tools + `tool_filter` in McpToolset (client-side subset selection):  
  https://google.github.io/adk-docs/tools-custom/mcp-tools/
- Example servers using progressive disclosure:
  - Rails MCP server with `search_tools` / `execute_tool`: https://github.com/maquina-app/rails-mcp-server
  - Unified MCP server (progressive discovery): https://github.com/sasajib/unified-mcp
  - StackOne AI SDK meta tools (meta_search_tools/meta_execute_tool): https://github.com/StackOneHQ/stackone-ai-python

