# Propuneri Progressive Disclosure pentru GHL MCP Server

**Data:** 2026-01-07
**Context:** MCP server cu 254 tools pentru GoHighLevel CRM
**Problemă:** Token overhead excesiv la încărcarea tuturor tool-urilor + JSON schemas

---

## Situația Curentă

| Metric | Valoare |
|--------|---------|
| Total tools | 254 |
| Categorii | 19 |
| Avg. schema size/tool | ~500-1500 tokens |
| **Estimated total tokens** | **~150,000-300,000 tokens** |

Problema reală: La fiecare conversație nouă, clientul MCP încarcă TOATE tool-urile cu schema lor completă. Pentru un server cu 254 tools, asta înseamnă:
- Context window poluat înainte de a începe lucrul
- Costuri mari per sesiune
- Model "overwhelmed" de opțiuni (choice overload)

---

## Analiza Opțiunilor

### Opțiunea A: Split în Multiple MCP Servers

**Concept:** Împărțire pe domenii funcționale

```
ghl-contacts-mcp     → 31 tools
ghl-conversations-mcp → 21 tools
ghl-calendar-mcp     → 39 tools
ghl-opportunities-mcp → 10 tools
ghl-ecommerce-mcp    → 46 tools (products + store + payments)
ghl-content-mcp      → 27 tools (blog + social + media)
ghl-admin-mcp        → 80 tools (locations, custom fields, objects, etc.)
```

**Pro:**
- ✅ Maximă compatibilitate (funcționează cu ORICE client MCP)
- ✅ Simplu de implementat (restructurare fișiere)
- ✅ Utilizatorii activează doar ce au nevoie
- ✅ Fiecare server sub 40-50 tools = manageable

**Contra:**
- ❌ Configurare manuală per proiect
- ❌ Cross-domain operations = multiple servers active = tokens crescuți
- ❌ Maintenance overhead (7 servers vs 1)
- ❌ Nu rezolvă problema pentru power users care au nevoie de tot

**Verdict:** Bună ca **fallback/opțiune secundară**, nu ca soluție principală.

---

### Opțiunea B: Meta-Tools Pattern (Search → Describe → Execute)

**Concept:** Expunem doar 3-5 tools care deschid accesul la catalog

```typescript
// Tools vizibile
search_tools(query, domain?, limit?, detail_level?)
describe_tools(tool_names[])
execute_tool(tool_name, args)
list_domains()
```

**Flow tipic:**
```
User: "Vreau să creez un contact"

Agent: search_tools("create contact")
→ Returns: [{name: "create_contact", summary: "Create new contact", domain: "contacts"}]

Agent: describe_tools(["create_contact"])
→ Returns: Full JSON schema + examples

Agent: execute_tool("create_contact", {firstName: "Ion", email: "ion@x.com"})
→ Returns: Contact created successfully
```

**Pro:**
- ✅ **Reducere masivă tokens** (~95%): 3-5 tools vs 254
- ✅ Scalează la mii de tools fără probleme
- ✅ Semantic search îmbunătățește tool selection
- ✅ Un singur server de administrat
- ✅ Flexibilitate maximă

**Contra:**
- ❌ Loop mai "chatty" (2-3 tool calls extra per operație)
- ❌ `execute_tool(args: object)` pierde strict validation la nivel de client
- ❌ Trebuie implementat search ranking + schema registry
- ❌ Necesită agent care înțelege pattern-ul

**Verdict:** **Soluția recomandată** pentru acest use case.

---

### Opțiunea C: Capability Toggles (Enable/Disable Domains)

**Concept:** Server pornește cu 0 tools, user activează domenii

```typescript
// Tools permanente
list_capabilities()
enable_capability(domain)
disable_capability(domain)

// După enable_capability("contacts"):
// → Server emite notifications/tools/list_changed
// → Client re-fetch tools
// → Acum vede create_contact, search_contacts, etc.
```

**Pro:**
- ✅ Tools native cu full schema (nu proxy)
- ✅ Control granular pe domenii
- ✅ Păstrează strict validation

**Contra:**
- ❌ Depinde de client să respecte `list_changed` notification
- ❌ Claude Desktop NU suportă complet acest pattern (încă)
- ❌ Complexitate implementare moderată
- ❌ Dacă user activează 5 domenii, revenim la problem

**Verdict:** Bună **în combinație** cu alte opțiuni, nu standalone.

---

### Opțiunea D: Umbrella Router Tool

**Concept:** Un singur tool care routează tot

```typescript
ghl_request({
  operation: "contacts.create",
  params: { firstName: "Ion", email: "ion@x.com" }
})
```

**Pro:**
- ✅ Minimum absolut de tokens (1 tool)
- ✅ Ușor de extins

**Contra:**
- ❌ Modelul trebuie să știe operațiile din memorie/docs
- ❌ Zero schema validation la client
- ❌ Risc mare de erori
- ❌ Security concerns (must whitelist everything)

**Verdict:** **Nu recomand** pentru un CRM complex. Prea fragil.

---

## Propunerea Mea: Arhitectură Hibridă

### Design Principal: Meta-Tools + High-Value Direct Tools

```
┌─────────────────────────────────────────────────────────────┐
│                    EXPOSED TOOLS (6-8)                       │
├─────────────────────────────────────────────────────────────┤
│  DISCOVERY TOOLS (always visible)                           │
│  ├── search_tools(query, domain?, limit?)                   │
│  ├── describe_tools(tool_names[])                           │
│  ├── execute_tool(tool_name, args)                          │
│  └── list_domains()                                         │
├─────────────────────────────────────────────────────────────┤
│  HIGH-VALUE DIRECT TOOLS (optional, top 3-4 most used)      │
│  ├── search_contacts(query)         ← direct, cu schema     │
│  ├── send_sms(contactId, message)   ← direct, cu schema     │
│  └── create_contact(...)            ← direct, cu schema     │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              INTERNAL TOOL REGISTRY (254 tools)             │
│  ├── Full JSON schemas stored                               │
│  ├── Searchable index (text + optional embeddings)          │
│  ├── Domain/category metadata                               │
│  └── Usage examples per tool                                │
└─────────────────────────────────────────────────────────────┘
```

### Componente Implementare

#### 1. Tool Registry (`src/registry/tool-registry.ts`)

```typescript
interface ToolMetadata {
  name: string;
  domain: string;           // "contacts", "calendar", etc.
  summary: string;          // 1 line, <100 chars
  description: string;      // Full description
  schema: JSONSchema;       // Full input schema
  examples?: ToolExample[]; // Usage examples
  tags: string[];           // Pentru search
}

class ToolRegistry {
  private tools: Map<string, ToolMetadata>;

  search(query: string, options?: SearchOptions): ToolSummary[];
  describe(toolNames: string[]): ToolMetadata[];
  execute(toolName: string, args: object): Promise<ToolResult>;
  listDomains(): DomainInfo[];
}
```

#### 2. Search Tool Implementation

```typescript
// search_tools - returnează summaries, NU full schemas
{
  name: "search_tools",
  description: "Search available GHL tools by keyword or domain",
  inputSchema: {
    type: "object",
    properties: {
      query: { type: "string", description: "Search keywords" },
      domain: {
        type: "string",
        enum: ["contacts", "conversations", "calendar", ...],
        description: "Filter by domain"
      },
      limit: { type: "number", default: 8, maximum: 20 }
    },
    required: ["query"]
  }
}

// Response example:
{
  results: [
    {
      name: "create_contact",
      domain: "contacts",
      summary: "Create a new contact with name, email, phone, tags",
      required_params: ["email"],
      relevance: 0.95
    },
    {
      name: "upsert_contact",
      domain: "contacts",
      summary: "Create or update contact by email/phone (smart merge)",
      required_params: [],
      relevance: 0.82
    }
  ],
  total_matches: 5,
  hint: "Use describe_tools(['create_contact']) to see full schema"
}
```

#### 3. Describe Tool Implementation

```typescript
// describe_tools - returnează FULL schemas pentru tools selectate
{
  name: "describe_tools",
  description: "Get full JSON schema and examples for specific tools",
  inputSchema: {
    type: "object",
    properties: {
      tool_names: {
        type: "array",
        items: { type: "string" },
        maxItems: 5,
        description: "Tool names to describe"
      },
      include_examples: { type: "boolean", default: true }
    },
    required: ["tool_names"]
  }
}
```

#### 4. Execute Tool Implementation

```typescript
// execute_tool - proxy cu VALIDARE
{
  name: "execute_tool",
  description: "Execute a GHL tool by name with validated arguments",
  inputSchema: {
    type: "object",
    properties: {
      tool_name: { type: "string" },
      args: { type: "object" }
    },
    required: ["tool_name", "args"]
  }
}

// CRITICAL: Validate args against stored schema BEFORE execution
async execute(toolName: string, args: object): Promise<ToolResult> {
  const tool = this.registry.get(toolName);
  if (!tool) throw new Error(`Unknown tool: ${toolName}`);

  const validation = validateAgainstSchema(args, tool.schema);
  if (!validation.valid) {
    return {
      success: false,
      error: "Invalid arguments",
      details: validation.errors,
      hint: `Required: ${tool.schema.required?.join(", ")}`
    };
  }

  return await tool.handler(args);
}
```

---

## Plan de Implementare

### Faza 1: Registry Infrastructure (2-3 ore)

1. Creează `src/registry/tool-registry.ts`
2. Extrage metadata din toate tool files existente
3. Implementează search simplu (text matching + domain filter)
4. Implementează describe (lookup + return schema)

### Faza 2: Meta-Tools (2-3 ore)

1. Creează `src/tools/meta-tools.ts` cu cele 4 tools
2. Modifică `server.ts` să expună DOAR meta-tools + opțional câteva direct tools
3. Implementează execute_tool cu validare

### Faza 3: Optimizări (1-2 ore)

1. Compactează descriptions (max 100 chars)
2. Adaugă examples pentru top 20 tools
3. Testează flow complet

### Faza 4: Fallback - Domain Split (opțional, 1-2 ore)

1. Configurație pentru a rula în "split mode"
2. Entry points separate per domeniu
3. Documentație pentru ambele moduri

---

## Comparație Token Usage

| Mod | Tools Exposed | Est. Tokens | Savings |
|-----|---------------|-------------|---------|
| Current (all) | 254 | ~200,000 | baseline |
| Meta-tools only | 4 | ~3,000 | **98.5%** |
| Meta + 4 direct | 8 | ~8,000 | **96%** |
| Split (1 domain) | ~30 | ~25,000 | **87.5%** |
| Split (3 domains) | ~90 | ~75,000 | **62.5%** |

---

## Recomandare Finală

**Implementează Meta-Tools Pattern** ca soluție primară:

1. **search_tools** - search semantic în catalog
2. **describe_tools** - full schema on-demand
3. **execute_tool** - proxy cu validare
4. **list_domains** - overview categorii

**Plus** expune direct 2-3 high-value tools pentru UX mai bun:
- `search_contacts` (cel mai folosit)
- `send_sms` (acțiune frecventă)
- `get_conversation` (debugging)

**Rezultat:** 6-7 tools vizibile vs 254 = **97% reducere tokens**

---

## Structură Fișiere Propusă

```
src/
├── registry/
│   ├── tool-registry.ts      # Registry + search + describe
│   ├── tool-metadata.ts      # Auto-extracted metadata from all tools
│   └── schema-validator.ts   # JSON Schema validation
├── tools/
│   ├── meta-tools.ts         # search_tools, describe_tools, execute_tool
│   ├── contact-tools.ts      # (existing, becomes internal)
│   ├── ...                   # (all existing, become internal)
│   └── index.ts              # Exports only meta + selected direct tools
└── server.ts                 # Modified to use new exports
```

---

## Next Steps

1. **Confirmare approach** - Alegi meta-tools pattern?
2. **Decide direct tools** - Care 2-3 tools vrei expuse direct?
3. **Start implementare** - Pot începe cu registry + meta-tools

---

*Raport generat pe baza research-ului MCP progressive disclosure patterns și analizei specifice pentru GHL MCP Server cu 254 tools.*
