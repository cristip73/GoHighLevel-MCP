# GHL MCP Tools Discovery Report

**Data:** 2025-01-08
**Scop:** Inventar complet al tools implementate și posibile de adăugat

---

## 1. Sumar Executiv

| Metric | Valoare |
|--------|---------|
| **Tools implementate** | 261 |
| **Categorii existente** | 21 |
| **Categorii noi identificate** | 15 |
| **Tools noi posibile** | ~95+ |

---

## 2. Tools Implementate Curent

### Per Categorie (21 fișiere, 261 tools)

| # | Categorie | Tools | Status |
|---|-----------|-------|--------|
| 1 | calendar-tools | 39 | ✅ Complet |
| 2 | contact-tools | 31 | ✅ Complet |
| 3 | location-tools | 24 | ✅ Complet |
| 4 | conversation-tools | 21 | ✅ Complet |
| 5 | payments-tools | 20 | ✅ Complet |
| 6 | store-tools | 18 | ✅ Complet |
| 7 | invoices-tools | 18 | ✅ Complet |
| 8 | social-media-tools | 17 | ✅ Complet |
| 9 | association-tools | 10 | ✅ Complet |
| 10 | opportunity-tools | 10 | ✅ Complet |
| 11 | products-tools | 10 | ✅ Complet |
| 12 | object-tools | 9 | ✅ Complet |
| 13 | custom-field-v2-tools | 8 | ✅ Complet |
| 14 | blog-tools | 7 | ✅ Complet |
| 15 | meta-tools | 7 | ✅ Complet |
| 16 | email-tools | 5 | ✅ Complet |
| 17 | media-tools | 3 | ✅ Complet |
| 18 | survey-tools | 2 | ✅ Complet |
| 19 | workflow-tools | 1 | ⚠️ Minimal |
| 20 | email-isv-tools | 1 | ⚠️ Minimal |

---

## 3. Categorii Noi de Implementat (VERIFICATE DE SUBAGENTS)

### Ordonate după Utilitate (de la cel mai util)

---

### 3.1 🔴 PRIORITATE CRITICĂ

#### A. Users API (5 tools) - **FOARTE UTIL** ✅ VERIFICAT
Gestionarea utilizatorilor este esențială pentru orice integrare.

| Tool Name | Method | Endpoint | Scope |
|-----------|--------|----------|-------|
| `users_get_user` | GET | `/users/:userId` | users.readonly |
| `users_create_user` | POST | `/users/` | users.write |
| `users_update_user` | PUT | `/users/:userId` | users.write |
| `users_delete_user` | DELETE | `/users/:userId` | users.write |
| `users_get_by_location` | GET | `/users/` | users.readonly |

**Base URL:** `https://services.leadconnectorhq.com`
**API Version:** `2021-07-28`

**Create User - Parametri required:**
```typescript
{
  companyId: string,      // Agency/Company ID
  firstName: string,
  lastName: string,
  email: string,
  password: string,
  type: string,           // e.g., "account"
  role: string,           // e.g., "admin"
  locationIds: string[]   // Array of location IDs
}
```

**Permissions Object:** 35+ boolean flags pentru granular access control:
- `campaignsEnabled`, `contactsEnabled`, `workflowsEnabled`
- `triggersEnabled`, `funnelsEnabled`, `websitesEnabled`
- `opportunitiesEnabled`, `dashboardStatsEnabled`, etc.

---

#### B. Forms API (3 tools) - **FOARTE UTIL**
Formularele sunt folosite intens pentru lead capture.

| Tool Name | Method | Endpoint | Scope |
|-----------|--------|----------|-------|
| `get_forms` | GET | `/forms/` | forms.readonly |
| `get_forms_submissions` | GET | `/forms/submissions` | forms.readonly |
| `upload_form_custom_files` | POST | `/forms/upload-custom-files` | forms.write |

**Parametri cheie pentru submissions:**
```typescript
{
  locationId: string,      // required
  page?: number,           // default: 1
  limit?: number,          // max: 100, default: 20
  formId?: string,         // filter by form
  q?: string,              // search by contact info
  startAt?: string,        // YYYY-MM-DD
  endAt?: string           // YYYY-MM-DD
}
```

---

#### C. Funnels API (7 tools) - **FOARTE UTIL**
Funnels sunt core pentru marketing automation.

| Tool Name | Method | Endpoint | Scope |
|-----------|--------|----------|-------|
| `get_funnels` | GET | `/funnels/` | funnels.readonly |
| `get_funnel_pages` | GET | `/funnels/{funnelId}/pages` | funnels.readonly |
| `get_funnel_pages_count` | GET | `/funnels/{funnelId}/pages/count` | funnels.readonly |
| `create_redirect` | POST | `/funnels/lookup/redirect` | funnels.write |
| `update_redirect` | PUT | `/funnels/lookup/redirect/{redirectId}` | funnels.write |
| `delete_redirect` | DELETE | `/funnels/lookup/redirect/{redirectId}` | funnels.write |
| `list_redirects` | GET | `/funnels/lookup/redirect` | funnels.readonly |

**Parametri pentru redirect:**
```typescript
{
  locationId: string,      // required
  domain: string,          // required
  path: string,            // required
  target: string,          // required - destination URL
  action: "redirect_301" | "redirect_302"
}
```

---

#### D. Campaigns API (1 tool) - **UTIL**
Avem deja contact tools pentru add/remove from campaign, dar lipsește listing.

| Tool Name | Method | Endpoint | Scope |
|-----------|--------|----------|-------|
| `get_campaigns` | GET | `/campaigns/` | campaigns.readonly |

**Parametri:**
```typescript
{
  locationId: string,      // required
  status?: "draft" | "published"
}
```

---

### 3.2 🟡 PRIORITATE ÎNALTĂ

#### E. Companies API (1 tool) ✅ VERIFICAT
Gestionarea companiilor pentru agency-level operations.

| Tool Name | Method | Endpoint | Scope | Token |
|-----------|--------|----------|-------|-------|
| `get_company` | GET | `/companies/:companyId` | companies.readonly | Agency |

**Note:** Companies API are doar read access. Pentru CRUD complet vezi Businesses API.

---

#### F. Businesses API (5 tools) ✅ VERIFICAT
Business entities pentru contacts.

| Tool Name | Method | Endpoint | Scope |
|-----------|--------|----------|-------|
| `create_business` | POST | `/businesses/` | businesses.write |
| `get_business` | GET | `/businesses/:businessId` | businesses.readonly |
| `list_businesses` | GET | `/businesses/?locationId=X` | businesses.readonly |
| `update_business` | PUT | `/businesses/:businessId` | businesses.write |
| `delete_business` | DELETE | `/businesses/:businessId` | businesses.write |

**Business Schema:**
```typescript
{
  name: string,
  phone?: string,
  email?: string,
  website?: string,
  address?: string,
  city?: string,
  state?: string,
  postalCode?: string,
  country?: string,
  description?: string
}
```

---

#### G. Trigger Links API (6 tools) ✅ VERIFICAT
Links pentru workflow automation.

| Tool Name | Method | Endpoint | Scope |
|-----------|--------|----------|-------|
| `get_trigger_links` | GET | `/links/` | links.readonly |
| `get_trigger_link_by_id` | GET | `/links/id/:linkId` | links.readonly |
| `search_trigger_links` | GET | `/links/search` | links.readonly |
| `create_trigger_link` | POST | `/links/` | links.write |
| `update_trigger_link` | PUT | `/links/:linkId` | links.write |
| `delete_trigger_link` | DELETE | `/links/:linkId` | links.write |

**Create/Update Body:**
```typescript
{
  locationId: string,    // required
  name: string,          // required - label for link
  redirectTo: string     // required - destination URL
}
```

**Response include `fieldKey`:** `{{trigger_link.<id>}}` - pentru use în templates

**Note:** Search endpoint uses API Version `2021-04-15`, others use `2021-07-28`

---

#### H. Snapshots API (4 tools)
Managementul snapshot-urilor pentru agency.

| Tool Name | Method | Endpoint | Scope |
|-----------|--------|----------|-------|
| `get_snapshots` | GET | `/snapshots/` | snapshots.readonly |
| `create_snapshot_share_link` | POST | `/snapshots/{snapshotId}/share` | snapshots.write |
| `get_snapshot_push_status` | GET | `/snapshots/push` | snapshots.readonly |
| `get_latest_snapshot_push` | GET | `/snapshots/push/latest` | snapshots.readonly |

---

### 3.3 🟢 PRIORITATE MEDIE

#### I. SaaS API (6 tools)
SaaS management pentru agencies.

| Tool Name | Method | Endpoint | Scope |
|-----------|--------|----------|-------|
| `get_agency_plans` | GET | `/saas-api/plans` | saas.readonly |
| `get_location_subscription` | GET | `/saas-api/subscriptions/{locationId}` | saas.readonly |
| `update_saas_subscription` | PUT | `/saas-api/subscriptions/{locationId}` | saas.write |
| `get_locations_by_stripe` | GET | `/saas-api/locations` | saas.readonly |
| `bulk_disable_saas` | POST | `/saas-api/bulk-disable` | saas.write |
| `generate_payment_link` | POST | `/saas-api/payment-link` | saas.write |

---

#### J. Conversation AI API (12 tools) ✅ VERIFICAT
AI agents pentru conversații - FOARTE COMPLET!

**Agent Management (5):**
| Tool Name | Method | Endpoint | Scope |
|-----------|--------|----------|-------|
| `conversationai_create_agent` | POST | `/conversation-ai/agents` | conversation-ai.write |
| `conversationai_search_agents` | GET | `/conversation-ai/agents/search` | conversation-ai.readonly |
| `conversationai_get_agent` | GET | `/conversation-ai/agents/:agentId` | conversation-ai.readonly |
| `conversationai_update_agent` | PUT | `/conversation-ai/agents/:agentId` | conversation-ai.write |
| `conversationai_delete_agent` | DELETE | `/conversation-ai/agents/:agentId` | conversation-ai.write |

**Action Management (6):**
| Tool Name | Method | Endpoint | Scope |
|-----------|--------|----------|-------|
| `conversationai_create_action` | POST | `/conversation-ai/agents/:agentId/actions` | conversation-ai.write |
| `conversationai_list_actions` | GET | `/conversation-ai/agents/:agentId/actions/list` | conversation-ai.readonly |
| `conversationai_get_action` | GET | `/conversation-ai/agents/:agentId/actions/:actionId` | conversation-ai.readonly |
| `conversationai_update_action` | PUT | `/conversation-ai/agents/:agentId/actions/:actionId` | conversation-ai.write |
| `conversationai_delete_action` | DELETE | `/conversation-ai/agents/:agentId/actions/:actionId` | conversation-ai.write |
| `conversationai_update_followup` | PATCH | `/conversation-ai/agents/:agentId/followup-settings` | conversation-ai.write |

**Generation (1):**
| Tool Name | Method | Endpoint | Scope |
|-----------|--------|----------|-------|
| `conversationai_get_generation` | GET | `/conversation-ai/generations` | conversation-ai.readonly |

**Action Types:** `triggerWorkflow`, `updateContactField`, `appointmentBooking`, `stopBot`, `humanHandOver`, `advancedFollowup`, `transferBot`

---

#### K. Voice AI API (8 tools)
Voice AI agents management.

| Tool Name | Method | Endpoint | Scope |
|-----------|--------|----------|-------|
| `create_voice_ai_agent` | POST | `/voice-ai/agents` | voice-ai.write |
| `get_voice_ai_agent` | GET | `/voice-ai/agents/{agentId}` | voice-ai.readonly |
| `patch_voice_ai_agent` | PATCH | `/voice-ai/agents/{agentId}` | voice-ai.write |
| `delete_voice_ai_agent` | DELETE | `/voice-ai/agents/{agentId}` | voice-ai.write |
| `create_voice_ai_action` | POST | `/voice-ai/agents/{agentId}/actions` | voice-ai.write |
| `update_voice_ai_action` | PUT | `/voice-ai/agents/{agentId}/actions/{actionId}` | voice-ai.write |
| `get_voice_ai_call_log` | GET | `/voice-ai/calls/{callId}` | voice-ai.readonly |
| `list_voice_ai_calls` | GET | `/voice-ai/calls` | voice-ai.readonly |

---

#### L. Knowledge Base API (15+ tools) ✅ VERIFICAT
Knowledge base pentru AI - MULT mai complex decât estimat!

**KB Management (5):**
| Tool Name | Method | Endpoint | Scope |
|-----------|--------|----------|-------|
| `get_knowledge_base` | GET | `/knowledge-bases/:id` | knowledge-base.readonly |
| `list_knowledge_bases` | GET | `/knowledge-bases/` | knowledge-base.readonly |
| `create_knowledge_base` | POST | `/knowledge-bases/` | knowledge-base.write |
| `update_knowledge_base` | PUT | `/knowledge-bases/:id` | knowledge-base.write |
| `delete_knowledge_base` | DELETE | `/knowledge-bases/:id` | knowledge-base.write |

**FAQ Management (4):**
| Tool Name | Method | Endpoint | Scope |
|-----------|--------|----------|-------|
| `list_knowledge_base_faqs` | GET | `/knowledge-bases/faqs` | knowledge-base.readonly |
| `create_knowledge_base_faq` | POST | `/knowledge-bases/faqs` | knowledge-base.write |
| `update_knowledge_base_faq` | PUT | `/knowledge-bases/faqs/:id` | knowledge-base.write |
| `delete_knowledge_base_faq` | DELETE | `/knowledge-bases/faqs/:id` | knowledge-base.write |

**Web Crawler (6+):**
| Tool Name | Method | Endpoint | Scope |
|-----------|--------|----------|-------|
| `list_trained_pages` | GET | `/knowledge-bases/crawler` | knowledge-base.readonly |
| `start_crawler` | POST | `/knowledge-bases/crawler` | knowledge-base.write |
| `get_crawler_status` | GET | `/knowledge-bases/crawler/status` | knowledge-base.readonly |
| `train_discovered_pages` | POST | `/knowledge-bases/crawler/train` | knowledge-base.write |
| `delete_trained_urls` | DELETE | `/knowledge-bases/crawler` | knowledge-base.write |

**Note:** Max 15 knowledge bases per location

---

### 3.4 🔵 PRIORITATE NORMALĂ

#### M. Phone System API (6 tools)
Managementul numerelor de telefon.

| Tool Name | Method | Endpoint | Scope |
|-----------|--------|----------|-------|
| `list_phone_numbers` | GET | `/phone-system/numbers` | phone-system.readonly |
| `get_active_numbers` | GET | `/phone-system/numbers/active` | phone-system.readonly |
| `list_number_pools` | GET | `/phone-system/pools` | phone-system.readonly |
| `get_number_pool` | GET | `/phone-system/pools/{poolId}` | phone-system.readonly |
| `create_number_pool` | POST | `/phone-system/pools` | phone-system.write |
| `update_number_pool` | PUT | `/phone-system/pools/{poolId}` | phone-system.write |

---

#### N. Proposals/Documents API (4 tools) ✅ VERIFICAT
Documente și contracte.

| Tool Name | Method | Endpoint | Scope |
|-----------|--------|----------|-------|
| `list_documents` | GET | `/proposals/document` | proposals.readonly |
| `send_document` | POST | `/proposals/document/send` | proposals.write |
| `list_document_templates` | GET | `/proposals/templates` | proposals.readonly |
| `send_document_template` | POST | `/proposals/templates/send` | proposals.write |

**list_documents Query Params:**
```typescript
{
  locationId: string,     // required
  status?: string,        // draft,sent,viewed,completed,accepted
  paymentStatus?: string, // waiting_for_payment,paid,no_payment
  limit?: number,
  skip?: number,
  query?: string,         // search
  dateFrom?: string,      // ISO 8601
  dateTo?: string
}
```

**Document Types:** `proposal`, `estimate`, `contentLibrary`

---

#### O. Custom Menus API (5 tools) ✅ VERIFICAT
Custom menu links pentru UI.

| Tool Name | Method | Endpoint | Scope |
|-----------|--------|----------|-------|
| `list_custom_menus` | GET | `/custom-menus/` | custom-menus.readonly |
| `get_custom_menu` | GET | `/custom-menus/:id` | custom-menus.readonly |
| `create_custom_menu` | POST | `/custom-menus/` | custom-menus.write |
| `update_custom_menu` | PUT | `/custom-menus/:id` | custom-menus.write |
| `delete_custom_menu` | DELETE | `/custom-menus/:id` | custom-menus.write |

**Custom Menu Schema:**
```typescript
{
  title: string,
  url: string,
  icon?: { name: string, fontFamily: 'fab'|'fas'|'far' },
  order: number,
  showOnCompany: boolean,
  showOnLocation: boolean,
  showToAllLocations: boolean,
  locations: string[],
  openMode: 'iframe' | 'new_tab' | 'current_tab',
  userRole: 'all' | 'admin' | 'user',
  allowCamera: boolean,
  allowMicrophone: boolean
}
```

---

#### P. Marketplace API (3 tools)
Developer marketplace tools.

| Tool Name | Method | Endpoint | Scope |
|-----------|--------|----------|-------|
| `get_wallet_charges` | GET | `/marketplace/wallet/charges` | marketplace.readonly |
| `check_wallet_funds` | GET | `/marketplace/wallet/has-funds` | marketplace.readonly |
| `get_installer_details` | GET | `/marketplace/installer` | marketplace.readonly |

---

## 4. Prioritizare Recomandată

### Faza 1 - Core Business (17 tools)
1. **Users API** (6) - Esențial pentru management
2. **Forms API** (3) - Lead capture
3. **Funnels API** (7) - Marketing funnels
4. **Campaigns API** (1) - Campaign listing

### Faza 2 - Extended Business (16 tools)
5. **Companies API** (5) - Agency management
6. **Businesses API** (5) - Business entities
7. **Trigger Links API** (6) - Workflow automation

### Faza 3 - AI & Automation (22 tools)
8. **Conversation AI** (6) - Chat AI
9. **Voice AI** (8) - Voice agents
10. **Knowledge Base** (8) - AI knowledge

### Faza 4 - Infrastructure (24 tools)
11. **SaaS API** (6) - SaaS management
12. **Phone System** (6) - Phone management
13. **Proposals** (5) - Documents
14. **Snapshots** (4) - Snapshots
15. **Custom Menus** (4) - UI customization
16. **Marketplace** (3) - Developer tools

---

## 5. Estimare Efort

| Fază | Tools | Complexitate | Fișiere Noi |
|------|-------|--------------|-------------|
| Faza 1 | 17 | Mediu | 3 (users, forms, funnels) |
| Faza 2 | 16 | Mediu | 3 (companies, businesses, links) |
| Faza 3 | 22 | Mare | 3 (conv-ai, voice-ai, kb) |
| Faza 4 | 24 | Mic-Mediu | 6 (rest) |
| **Total** | **79** | - | **15** |

---

## 6. Template Implementare

### Exemplu: Forms API

```typescript
// src/tools/forms-tools.ts

import { GHLApiClient } from '../clients/ghl-api-client';

export const formsTools = [
  {
    name: "get_forms",
    description: "Get Forms. Requires scope: forms.readonly",
    inputSchema: {
      type: "object",
      properties: {
        locationId: {
          type: "string",
          description: "Location ID (required)"
        },
        skip: {
          type: "number",
          description: "Skip count for pagination"
        },
        limit: {
          type: "number",
          description: "Limit (max: 50, default: 10)"
        },
        type: {
          type: "string",
          enum: ["folder", "form"],
          description: "Filter by type"
        }
      },
      required: ["locationId"]
    }
  },
  {
    name: "get_forms_submissions",
    description: "Get Forms Submissions. Requires scope: forms.readonly",
    inputSchema: {
      type: "object",
      properties: {
        locationId: {
          type: "string",
          description: "Location ID (required)"
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
          description: "Search by contactId, name, email or phone"
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
];
```

---

## 7. Resurse

- **Docs oficiale:** https://marketplace.gohighlevel.com/docs/ghl
- **OAuth Scopes:** https://marketplace.gohighlevel.com/docs/Authorization/Scopes
- **GitHub:** https://github.com/GoHighLevel/highlevel-api-docs

---

## 8. Next Steps

1. [ ] Confirmă prioritatea cu stakeholders
2. [ ] Începe implementarea Faza 1 (Users, Forms, Funnels)
3. [ ] Adaugă teste pentru fiecare tool nou
4. [ ] Update CLAUDE.md cu count-ul nou de tools
5. [ ] Documentează scopes necesare în README
