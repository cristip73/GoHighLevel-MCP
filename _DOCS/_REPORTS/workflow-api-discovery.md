# Workflow: Descoperire și Implementare API-uri GHL

**Data:** 2025-01-08
**Scop:** Proces standardizat pentru adăugarea de noi tool-uri în MCP server

---

## 1. Instrumente Testate

| Tool | Site | Rezultat | Utilizare |
|------|------|----------|-----------|
| **Firecrawl** | highlevel.stoplight.io | ❌ 404 | Nu funcționează |
| **Firecrawl** | marketplace.gohighlevel.com | ✅ Excelent | Extragere detaliată |
| **Exa search** | oricare | ✅ Bun | Discovery API-uri |
| **Exa get_code_context** | oricare | ✅ Foarte bun | Context cod + discovery |

---

## 2. URL-uri Corecte pentru Documentație

```
# ✅ CORECT - Folosește acest format:
https://marketplace.gohighlevel.com/docs/ghl/{category}/{endpoint}

# Exemple:
https://marketplace.gohighlevel.com/docs/ghl/forms/get-forms-submissions
https://marketplace.gohighlevel.com/docs/ghl/users/create-user
https://marketplace.gohighlevel.com/docs/ghl/users/get-user

# ❌ INCORECT - Nu funcționează:
https://highlevel.stoplight.io/docs/integrations/...
```

---

## 3. Workflow în 4 Pași

### Pas 1: Discovery - Găsește API-uri lipsă

Folosește **Exa `get_code_context`** pentru a descoperi ce API-uri există:

```
Query: "GoHighLevel API {category} endpoint request response schema"
Tokens: 8000-10000
```

**Exemplu:**
```json
{
  "query": "GoHighLevel API Users create user get user update user delete user endpoint",
  "tokensNum": 10000
}
```

Rezultat: Lista de endpoint-uri disponibile + URL-uri documentație.

---

### Pas 2: Extragere Detaliată - Obține Schema Completă

Folosește **Firecrawl `scrape`** pe URL-ul corect:

```json
{
  "url": "https://marketplace.gohighlevel.com/docs/ghl/{category}/{endpoint}",
  "formats": ["markdown"],
  "onlyMainContent": true
}
```

**Output obținut:**
- HTTP Method + Endpoint path
- Required scopes
- Header parameters
- Query parameters (cu tipuri și exemple)
- Request body schema
- Response schema completă
- Exemple curl/nodejs/python

---

### Pas 3: Mapare la Tool Definition

Din output-ul Firecrawl, extrage:

```typescript
{
  name: "get_forms_submissions",           // din endpoint name
  description: "Get Forms Submissions",    // din titlu
  inputSchema: {
    type: "object",
    properties: {
      locationId: { type: "string" },      // din Query Parameters
      page: { type: "number" },
      limit: { type: "number" },
      formId: { type: "string" },
      q: { type: "string" },
      startAt: { type: "string" },
      endAt: { type: "string" }
    },
    required: ["locationId"]               // din "required" markers
  }
}
```

---

### Pas 4: Implementare Tool

Creează tool-ul în fișierul corespunzător din `src/tools/`:

```typescript
{
  name: "get_forms_submissions",
  description: "Get Forms Submissions. Requires scope: forms.readonly",
  inputSchema: {
    type: "object",
    properties: {
      locationId: {
        type: "string",
        description: "Location ID"
      },
      page: {
        type: "number",
        description: "Page number (default: 1)"
      },
      limit: {
        type: "number",
        description: "Records per page (max: 100, default: 20)"
      },
      formId: {
        type: "string",
        description: "Filter by form ID"
      },
      q: {
        type: "string",
        description: "Filter by contactId, name, email or phone"
      },
      startAt: {
        type: "string",
        description: "Start date (YYYY-MM-DD)"
      },
      endAt: {
        type: "string",
        description: "End date (YYYY-MM-DD)"
      }
    },
    required: ["locationId"]
  }
}
```

---

## 4. API-uri de Explorat (Lipsă din Implementare)

### Categorie: Users
- `GET /users/{userId}` - Get User
- `POST /users/` - Create User
- `PUT /users/{userId}` - Update User
- `DELETE /users/{userId}` - Delete User
- `GET /users/location/{locationId}` - Get Users by Location

### Categorie: Forms
- `GET /forms/` - Get Forms
- `GET /forms/submissions` - Get Forms Submissions
- `POST /forms/upload-custom-files` - Upload Files to Custom Fields

### Categorie: Funnels
- TBD - necesită discovery

### Categorie: Links/Triggers
- `GET /links/` - Get Links
- TBD - necesită discovery

### Categorie: Companies
- `GET /companies/` - Get Companies
- TBD - necesită discovery

### Categorie: Snapshots
- TBD - necesită discovery

---

## 5. Comandă Rapidă pentru Discovery

Pentru a găsi rapid toate endpoint-urile unei categorii:

```
# Cu Exa get_code_context:
Query: "site:marketplace.gohighlevel.com GoHighLevel API {CATEGORY} endpoints"

# Apoi cu Firecrawl map pentru a lista toate URL-urile:
{
  "url": "https://marketplace.gohighlevel.com/docs/ghl/{category}",
  "search": "endpoint"
}
```

---

## 6. Checklist Implementare

- [ ] Discovery cu Exa - identifică endpoint-uri
- [ ] Scrape cu Firecrawl - obține schema completă
- [ ] Verifică scopes necesare
- [ ] Creează tool definition
- [ ] Implementează handler în tools file
- [ ] Adaugă în index/exports
- [ ] Testează cu execute_tool
- [ ] Update CLAUDE.md cu count-ul nou

---

## 7. Resurse

- **Docs oficiale:** https://marketplace.gohighlevel.com/docs/
- **GitHub API docs:** https://github.com/GoHighLevel/highlevel-api-docs
- **OAuth scopes:** https://marketplace.gohighlevel.com/docs/ghl/oauth/scopes
