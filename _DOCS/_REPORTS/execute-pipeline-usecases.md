# execute_pipeline - Use Cases & Best Practices

## Overview

`execute_pipeline` is a powerful tool for executing multi-step GoHighLevel workflows server-side. It chains tool calls together, passing results between steps via variable interpolation, and returns only the final result to minimize context usage.

## Key Features

- **Sequential Step Execution**: Steps execute in order, with each step's result available to subsequent steps
- **Variable Interpolation**: Reference previous results with `{{step_id.field}}` syntax
- **Loop Support**: Iterate over arrays with `{{item}}` and `{{index}}` variables
- **Parallel Loop Execution**: Configure concurrency for loops (default: 5, max: 10)
- **Filter Support**: Skip loop items conditionally with filter expressions
- **Return Templates**: Select specific fields from results to reduce output size
- **Array Wildcard `[*]`**: Extract fields from all array elements (NEW)
- **Projection Warnings**: Get notified when requested fields don't exist (NEW)

## Syntax

```json
{
  "steps": [
    { "id": "step1", "tool_name": "...", "args": {...} },
    { "id": "step2", "tool_name": "...", "args": { "field": "{{step1.result}}" } }
  ],
  "return": {
    "step1": ["field1", "field2"],
    "step2": ["nested.path", "array[*].field"]
  },
  "timeout_ms": 120000
}
```

---

## Use Cases de Succes (din Producție)

### 1. Agregare Statistici din Multiple Pipelines

**Scenariu**: Obține totaluri din mai multe pipeline-uri într-un singur call.

```json
{
  "steps": [
    { "id": "main", "tool_name": "search_opportunities", "args": { "pipelineId": "pipe_main", "limit": 1 } },
    { "id": "webinars", "tool_name": "search_opportunities", "args": { "pipelineId": "pipe_webinars", "limit": 1 } },
    { "id": "events", "tool_name": "search_opportunities", "args": { "pipelineId": "pipe_events", "limit": 1 } }
  ],
  "return": {
    "main": ["meta.total"],
    "webinars": ["meta.total"],
    "events": ["meta.total"]
  }
}
```

**Rezultat** (1787ms pentru 5 queries):
```json
{
  "success": true,
  "result": {
    "main": { "meta": { "total": 1287 } },
    "webinars": { "meta": { "total": 287 } },
    "events": { "meta": { "total": 156 } }
  }
}
```

### 2. Căutare cu Extragere Câmpuri Specifice (Array Wildcard)

**Scenariu**: Caută contacte și extrage doar câmpurile necesare.

```json
{
  "steps": [
    { "id": "search", "tool_name": "search_contacts", "args": { "limit": 10 } }
  ],
  "return": {
    "search": ["contacts[*].firstName", "contacts[*].email", "total"]
  }
}
```

**Rezultat**:
```json
{
  "success": true,
  "result": {
    "search": {
      "contacts": {
        "firstName": ["Mihaela", "Adelina", "Ion", ...],
        "email": ["miha@test.com", "adelina@test.com", ...]
      },
      "total": 107229
    }
  }
}
```

### 3. Loop cu Procesare per Item

**Scenariu**: Caută contacte și obține conversațiile pentru fiecare.

```json
{
  "steps": [
    { "id": "contacts", "tool_name": "search_contacts", "args": { "limit": 5 } },
    {
      "id": "conversations",
      "tool_name": "get_contact_conversations",
      "args": { "contactId": "{{item.id}}" },
      "loop": "{{contacts.contacts}}",
      "concurrency": 5
    }
  ]
}
```

**Rezultat**:
```json
{
  "success": true,
  "result": [
    { "messages": [...], "contactId": "c1" },
    { "messages": [...], "contactId": "c2" },
    ...
  ]
}
```

### 4. Loop cu Filtrare Condiționată

**Scenariu**: Procesează doar contactele care au email.

```json
{
  "steps": [
    { "id": "contacts", "tool_name": "search_contacts", "args": { "limit": 20 } },
    {
      "id": "with_email",
      "tool_name": "send_email",
      "args": {
        "contactId": "{{item.id}}",
        "subject": "Hello",
        "message": "Welcome!"
      },
      "loop": "{{contacts.contacts}}",
      "filter": "{{item.email}}"
    }
  ]
}
```

### 5. Chain Multi-Step: Search → Details → Action

**Scenariu**: Workflow complet cu mai multe etape.

```json
{
  "steps": [
    { "id": "search", "tool_name": "search_contacts", "args": { "query": "VIP" } },
    { "id": "first", "tool_name": "get_contact", "args": { "contactId": "{{search.contacts[0].id}}" } },
    { "id": "tasks", "tool_name": "get_contact_tasks", "args": { "contactId": "{{first.id}}" } },
    { "id": "notify", "tool_name": "send_sms", "args": {
        "contactId": "{{first.id}}",
        "message": "You have {{tasks.length}} pending tasks"
      }
    }
  ],
  "return": {
    "first": ["firstName", "email"],
    "tasks": ["[*].title"],
    "notify": ["messageId"]
  }
}
```

---

## Return Projection Syntax

### Câmpuri Simple
```json
"return": { "step": ["id", "name", "email"] }
```

### Nested Paths (Dot Notation)
```json
"return": { "step": ["contact.email", "meta.total", "address.city"] }
```

### Array Index
```json
"return": { "step": ["contacts[0]", "items[0].name"] }
```

### Array Wildcard `[*]` (NOU)
```json
"return": { "step": ["contacts[*].firstName", "contacts[*].tags"] }
```
Extrage câmpul specificat din **toate** elementele array-ului.

### Nested Wildcard
```json
"return": { "step": ["opportunities[*].contact.firstName"] }
```

---

## Variabile Disponibile

| Variabilă | Context | Descriere |
|-----------|---------|-----------|
| `{{step_id}}` | Global | Rezultatul complet al unui step anterior |
| `{{step_id.field}}` | Global | Câmp specific din rezultat |
| `{{step_id.array[0]}}` | Global | Element specific din array |
| `{{item}}` | Loop | Elementul curent din iterație |
| `{{item.field}}` | Loop | Câmp din elementul curent |
| `{{index}}` | Loop | Indexul curent (0-based) |

---

## Warnings (NOU)

Când un câmp cerut în return template nu există, primești un warning:

```json
{
  "success": true,
  "result": { "step": { "id": 1 } },
  "warnings": [
    "[step] Field \"nonexistent.path\" not found in result"
  ]
}
```

Asta ajută la debugging fără a face pipeline-ul să eșueze.

---

## Gotchas & Troubleshooting

### 1. Loop-ul returnează obiecte goale `[{}, {}, ...]`
**Cauză**: `args` nu folosește `{{item}}`, deci fiecare iterație face același call.

**Greșit**:
```json
{ "args": {}, "loop": "{{contacts}}" }
```

**Corect**:
```json
{ "args": { "contactId": "{{item.id}}" }, "loop": "{{contacts}}" }
```

### 2. Array wildcard `[*]` nu funcționează
**Verifică**: Ai folosit corect sintaxa? Ex: `contacts[*].firstName` (nu `contacts.*.firstName`)

### 3. Rezultat gol pentru un step
**Verifică**:
- Există câmpul în rezultatul real?
- Folosești calea corectă? (case-sensitive)
- Check `warnings` în response pentru indicii

### 4. Timeout
**Soluție**: Mărește `timeout_ms` (default: 120000ms, max: 300000ms)

### 5. Step references unknown step
**Cauză**: Încerci să referențiezi un step care nu există sau vine după step-ul curent.

### 6. Concurrency issues în loop
**Soluție**: Reduce `concurrency` dacă ai rate limiting issues (default: 5, max: 10)

---

## Limitări

| Limit | Valoare | Descriere |
|-------|---------|-----------|
| Max steps | 20 | Maximum steps per pipeline |
| Max loop iterations | 100 | Maximum items in a loop |
| Max concurrency | 10 | Maximum parallel executions in loop |
| Max timeout | 300000ms | 5 minute maximum |
| Max delay per step | 30000ms | 30 seconds |

---

## Performance Tips

1. **Folosește `return` template**: Reduce data transferată
2. **Folosește `[*]` wildcard**: Mai eficient decât loop pentru extragere simplă
3. **Setează `concurrency` în loops**: Paralelizare pentru operații independente
4. **Folosește `filter` în loops**: Evită procesarea inutilă
5. **Agregă în pipeline**: Un pipeline cu 5 steps e mai rapid decât 5 calls separate

---

## Exemple Complete

### Contact Enrichment Pipeline
```json
{
  "steps": [
    { "id": "search", "tool_name": "search_contacts", "args": { "query": "email:@company.com", "limit": 10 } },
    { "id": "enrich", "tool_name": "get_contact", "args": { "contactId": "{{item.id}}" }, "loop": "{{search.contacts}}", "concurrency": 5 },
    { "id": "tag", "tool_name": "add_contact_tags", "args": { "contactId": "{{item.id}}", "tags": ["enriched"] }, "loop": "{{search.contacts}}" }
  ],
  "return": {
    "search": ["total"],
    "enrich": ["[*].customFields"]
  }
}
```

### Sales Pipeline Overview
```json
{
  "steps": [
    { "id": "pipelines", "tool_name": "get_pipelines", "args": {} },
    { "id": "stats", "tool_name": "search_opportunities", "args": { "pipelineId": "{{item.id}}", "limit": 1 }, "loop": "{{pipelines.pipelines}}" }
  ],
  "return": {
    "pipelines": ["pipelines[*].name"],
    "stats": ["[*].meta.total"]
  }
}
```
