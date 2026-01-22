# Raport Testare MCP GoHighLevel (GHL)

**Data**: 7 Ianuarie 2026
**Autor**: Cristi (testat cu Claude Code)
**Scop**: Evaluarea tool-urilor MCP GHL și propuneri de optimizare pentru reducerea consumului de context LLM

---

## 1. Sumar Executiv

Am testat extensiv serverul MCP GHL local pentru un use case real: **căutarea tuturor pacienților cu numele "Danielescu" și extragerea ultimului SMS trimis fiecăruia**.

### Concluzii Principale:
- MCP-ul funcționează corect și oferă 3 metode diferite pentru operații bulk
- **Problema principală**: Toate rezultatele trec prin contextul LLM, consumând tokeni și încetinind procesarea
- **Oportunitate**: Implementarea unui layer de "server-side processing" care să facă query-uri complexe fără a returna date intermediare în context

---

## 2. Teste Efectuate

### 2.1 Scenariul de Test

**Obiectiv**: Pentru toți pacienții cu numele "Danielescu", găsește ultimul SMS trimis fiecăruia.

**Pași necesari**:
1. `search_contacts(query: "danielescu")` → 5 contacte găsite
2. Pentru fiecare contact: `search_conversations(contactId: X)` → obține conversationId
3. Pentru fiecare conversație: `get_conversation(conversationId: Y, messageTypes: ["TYPE_SMS"])` → obține mesajele SMS

### 2.2 Rezultate Găsite

| Pacient | Telefon | Are SMS? | Ultimul SMS |
|---------|---------|----------|-------------|
| Andreea Danielescu | +40725918110 | ✅ Da | 15.07.2025 - "Bun venit la Kilostop!..." |
| Lidia Danielescu | +40744432737 | ❌ Nu | Fără conversații |
| Cella Danielescu | +40727942967 | ❌ Nu | Doar event NO_SHOW |
| Camelia Danielescu | +40723234583 | ❌ Nu | Doar email-uri |
| Dragos Danielescu | +40766015670 | ❌ Nu | Doar email-uri |

---

## 3. Metode Testate și Comparație

### 3.1 Metoda 1: `execute_tool` (apeluri paralele multiple)

**Implementare**:
```javascript
// Pas 1: Căutare contacte
search_contacts({ query: "danielescu" })

// Pas 2: 5 apeluri paralele pentru conversații
execute_tool({ tool_name: "search_conversations", args: { contactId: "ID1" } })
execute_tool({ tool_name: "search_conversations", args: { contactId: "ID2" } })
// ... x5

// Pas 3: 4 apeluri paralele pentru SMS-uri
execute_tool({ tool_name: "get_conversation", args: { conversationId: "C1", messageTypes: ["TYPE_SMS"] } })
// ... x4
```

**Metrici**:
- Apeluri tool: **9** (1 + 5 + 4, minus Lidia fără conversație)
- Timp total: ~1-2 secunde
- Context consumat: **MARE** - toate rezultatele intermediare intră în context

---

### 3.2 Metoda 2: `execute_batch`

**Implementare**:
```javascript
// Pas 1: Batch pentru conversații
execute_batch({
  tool_name: "search_conversations",
  items: [
    { contactId: "ID1", limit: 1 },
    { contactId: "ID2", limit: 1 },
    // ... x5
  ],
  options: {
    concurrency: 5,
    result_mode: "detail",
    select_fields: ["conversations[0].id", "conversations[0].fullName"]
  }
})

// Pas 2: Batch pentru SMS-uri
execute_batch({
  tool_name: "get_conversation",
  items: [
    { conversationId: "C1", messageTypes: ["TYPE_SMS"], limit: 5 },
    // ... x4
  ],
  options: {
    concurrency: 5,
    result_mode: "detail",
    select_fields: ["conversation.contactId", "messages.messages"]
  }
})
```

**Metrici**:
- Apeluri tool: **2**
- Timp total: ~950ms (342ms + 607ms)
- Context consumat: **MEDIU** - `select_fields` reduce datele returnate
- Rate limiting: Automat, cu tracking (`tokens_remaining: 91`)

**Avantaje**:
- `select_fields` permite proiecție și reduce volumul de date
- `result_mode: "summary"` disponibil pentru și mai puțin output
- Rate limiting integrat

---

### 3.3 Metoda 3: `execute_pipeline`

**Implementare**:
```javascript
execute_pipeline({
  steps: [
    {
      id: "search",
      tool_name: "search_contacts",
      args: { query: "danielescu", limit: 10 }
    },
    {
      id: "conv0",
      tool_name: "search_conversations",
      args: { contactId: "{{search.contacts[0].id}}", limit: 1 }
    },
    {
      id: "conv1",
      tool_name: "search_conversations",
      args: { contactId: "{{search.contacts[1].id}}", limit: 1 }
    },
    // ... conv2, conv3, conv4
    {
      id: "sms0",
      tool_name: "get_conversation",
      args: {
        conversationId: "{{conv0.conversations[0].id}}",
        messageTypes: ["TYPE_SMS"],
        limit: 1
      }
    },
    // ... sms2, sms3, sms4
  ],
  return: {
    "search": ["contacts[0].firstName", "contacts[1].firstName", ...],
    "sms0": ["messages.messages[0].body", "messages.messages[0].dateAdded"],
    // ...
  },
  timeout_ms: 60000
})
```

**Metrici**:
- Apeluri tool: **1**
- Pași executați server-side: **10**
- Timp total: ~3.7 secunde (secvențial, nu paralel)
- Context consumat: **MIC** - doar rezultatul final conform `return` template

**Avantaje**:
- Un singur apel, tot procesarea e server-side
- `return` template permite să specifici exact ce câmpuri vrei înapoi
- Variabile între pași cu `{{step_id.field}}` syntax

**Limitări**:
- Pașii sunt **secvențiali**, nu paraleli
- Nu există loop/iterație automată - trebuie să specifici fiecare index manual
- Mai lent decât batch pentru operații paralele

---

## 4. Tabel Comparativ Final

| Criteriu | execute_tool | execute_batch | execute_pipeline |
|----------|--------------|---------------|------------------|
| **Apeluri MCP** | 9 | 2 | 1 |
| **Timp execuție** | ~1-2s | ~950ms | ~3.7s |
| **Paralelism** | ✅ (LLM face paralel) | ✅ (server-side) | ❌ (secvențial) |
| **Context LLM consumat** | MARE | MEDIU | MIC |
| **Flexibilitate** | Mare | Medie | Mică (no loops) |
| **Cel mai bun pentru** | Operații diverse | Bulk operations | Workflows liniare |

---

## 5. Problema Principală: Context LLM

### Ce se întâmplă acum:

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Claude LLM    │────▶│   MCP Server    │────▶│  GHL API        │
│                 │◀────│                 │◀────│                 │
│  (TOATE datele  │     │                 │     │                 │
│   trec prin     │     │                 │     │                 │
│   context!)     │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

Chiar și cu `execute_pipeline`, LLM-ul trebuie să:
1. Parseze întregul răspuns
2. Îl țină în context pentru răspunsul către user
3. Folosească tokeni pentru date care poate nu sunt relevante

### Exemplu concret din testele noastre:

Când am făcut `search_contacts("danielescu")`, am primit înapoi ~200 linii de JSON cu:
- customFields (10+ per contact)
- tags (5-10 per contact)
- dndSettings
- attributionSource
- opportunities
- etc.

**Din toate acestea, aveam nevoie doar de**: `id`, `firstName`, `lastName`, `phone`

---

## 6. Propuneri de Îmbunătățire

### 6.1 Propunere: `execute_query` - Query Language Server-Side

Un nou tool care acceptă un query DSL și returnează doar rezultatul final:

```javascript
execute_query({
  query: `
    SEARCH contacts WHERE name CONTAINS "danielescu"
    FOR EACH contact:
      GET conversations WHERE contactId = contact.id LIMIT 1
      IF conversation EXISTS:
        GET messages WHERE conversationId = conversation.id
                    AND messageType = "TYPE_SMS"
                    LIMIT 1
    RETURN {
      name: contact.firstName + " " + contact.lastName,
      phone: contact.phone,
      lastSms: message.body,
      lastSmsDate: message.dateAdded
    }
  `
})
```

**Rezultat**: Un singur array cu exact datele cerute, procesare 100% server-side.

---

### 6.2 Propunere: `execute_pipeline` cu suport pentru loops

Extinderea pipeline-ului actual cu sintaxă pentru iterații:

```javascript
execute_pipeline({
  steps: [
    {
      id: "search",
      tool_name: "search_contacts",
      args: { query: "danielescu" }
    },
    {
      id: "conversations",
      tool_name: "search_conversations",
      loop: "{{search.contacts}}",  // <-- NOU: iterează peste array
      args: { contactId: "{{item.id}}", limit: 1 }
    },
    {
      id: "sms_messages",
      tool_name: "get_conversation",
      loop: "{{conversations.results}}",
      filter: "{{item.conversations.length > 0}}",  // <-- NOU: skip dacă nu există
      args: {
        conversationId: "{{item.conversations[0].id}}",
        messageTypes: ["TYPE_SMS"]
      }
    }
  ],
  return: {
    // template pentru output
  }
})
```

---

### 6.3 Propunere: Compound Tools Pre-definite

Tool-uri compuse pentru use case-uri comune:

```javascript
// Tool pre-definit în MCP
get_contacts_with_last_sms({
  query: "danielescu",
  fields: ["firstName", "lastName", "phone", "lastSms", "lastSmsDate"]
})
```

Implementarea e server-side, face toate query-urile necesare, returnează doar rezultatul final.

---

### 6.4 Propunere: `stream_to_file` mode

Pentru rezultate mari, opțiunea de a scrie direct într-un fișier în loc să returneze în context:

```javascript
execute_batch({
  tool_name: "search_contacts",
  items: [...1000 queries...],
  options: {
    result_mode: "file",  // Deja există!
    file_path: "/tmp/results.json"  // <-- Să accepte path custom
  }
})

// Returnează doar: { success: true, file: "/tmp/results.json", count: 1000 }
```

---

## 7. Prioritizare Recomandată

| Prioritate | Propunere | Efort | Impact |
|------------|-----------|-------|--------|
| 🔴 HIGH | Loop support în pipeline | Mediu | Mare |
| 🔴 HIGH | `select_fields` în `search_contacts` | Mic | Mare |
| 🟡 MEDIUM | Compound tools pentru use case-uri comune | Mare | Mare |
| 🟡 MEDIUM | Custom file path pentru `result_mode: "file"` | Mic | Mediu |
| 🟢 LOW | Query DSL complet | Foarte mare | Foarte mare |

---

## 8. Anexă: Logs Complete din Teste

### Test 1: search_contacts

```json
{
  "query": "danielescu",
  "total": 5,
  "contacts": [
    { "id": "IjEZMwjNDbOGM4YSCBkz", "firstName": "Andreea", "lastName": "Danielescu" },
    { "id": "B5i9SVkmkjtjPXenmKD8", "firstName": "LIDIA", "lastName": "DANIELESCU" },
    { "id": "MqHyXqG638sIeJRFStYg", "firstName": "Cella", "lastName": "Danielescu" },
    { "id": "0HzhjTUrOhz6tnAp3y9B", "firstName": "Camelia", "lastName": "Danielescu" },
    { "id": "7QxI65AOYq1oXGShE8iI", "firstName": "Dragos", "lastName": "Danielescu" }
  ]
}
```

### Test 2: execute_batch pentru conversații

```json
{
  "total": 5,
  "succeeded": 5,
  "failed": 0,
  "duration_ms": 342,
  "rate_limit_state": {
    "tokens_remaining": 95
  }
}
```

### Test 3: execute_pipeline complet (10 pași)

```json
{
  "steps_completed": 10,
  "total_steps": 10,
  "duration_ms": 3731,
  "result": {
    "sms0": {
      "messages": {
        "messages": [{
          "body": "Bun venit la Kilostop! Solicitarea ta a fost înregistrată...",
          "dateAdded": "2025-07-15T09:57:44.000Z",
          "status": "delivered"
        }]
      }
    },
    "sms2": {},
    "sms3": {},
    "sms4": {}
  }
}
```

---

## 9. Concluzii

MCP-ul GHL este bine implementat și oferă flexibilitate prin cele 3 metode de execuție. Principala oportunitate de îmbunătățire este **reducerea datelor care trec prin contextul LLM** prin:

1. **Suport pentru loops în pipeline** - cea mai valoroasă îmbunătățire
2. **Proiecție (`select_fields`) în toate tool-urile** - nu doar în batch
3. **Compound tools** pentru operații comune multi-step

Aceste îmbunătățiri ar reduce dramatic consumul de tokeni și ar face MCP-ul mult mai eficient pentru operații complexe.

---

*Raport generat pe baza testelor efectuate pe 7 Ianuarie 2026*
