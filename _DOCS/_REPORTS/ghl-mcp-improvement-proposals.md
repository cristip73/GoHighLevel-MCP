# GHL MCP Server - Propuneri de Îmbunătățire

> Document generat în urma unui research session pe baza de date GoHighLevel Kilostop
> Data: 7 Ianuarie 2026
> Scop: Identificarea limitărilor actuale și propuneri de îmbunătățiri pentru tools

---

## Context

În timpul investigării bazei de date GHL Kilostop (107K contacte, 57K oportunități, 68K conversații), am întâmpinat mai multe limitări ale tool-urilor MCP existente care au îngreunat sau împiedicat anumite query-uri.

---

## Problema 1: `get_calendar_events` - Parametri Obligatorii Prea Restrictivi

### Situația Actuală
```
Error: Either of userId, calendarId or groupId is required
```

Tool-ul `get_calendar_events` necesită obligatoriu unul dintre: `userId`, `calendarId`, sau `groupId`. Nu există posibilitatea de a obține toate evenimentele din toate calendarele simultan.

### Exemplu de Query Eșuat
```javascript
get_calendar_events({
  startTime: "2025-01-01T00:00:00Z",
  endTime: "2026-01-07T23:59:59Z"
})
// → Error: Either of userId, calendarId or groupId is required
```

### Propunere de Soluție

**Opțiunea A**: Adaugă parametru `allCalendars: boolean`
```javascript
get_calendar_events({
  startTime: "2025-01-01T00:00:00Z",
  endTime: "2026-01-07T23:59:59Z",
  allCalendars: true  // Nou parametru
})
```

**Opțiunea B**: Fă parametrii de filtrare opționali
- Dacă nu e specificat niciun filtru, returnează din toate calendarele
- Adaugă `limit` și `offset` pentru paginare

### Impact
- **Severitate**: High
- **Use case**: Obținerea statisticilor de programări pe întreaga locație

---

## Problema 2: `get_calendars` - Output Prea Mare

### Situația Actuală
```
Error: result (1,174,794 characters) exceeds maximum allowed tokens
```

Tool-ul returnează toate detaliile pentru toate calendarele, rezultând în ~1.2MB de date care depășesc limita.

### Propunere de Soluție

**Opțiunea A**: `return_mode: summary` mai agresiv
```javascript
get_calendars({ return_mode: "summary" })
// Ar trebui să returneze doar:
// [{id, name, calendarType, eventCount, isActive}, ...]
```

**Opțiunea B**: Suport pentru `select_fields` în options
```javascript
execute_tool({
  tool_name: "get_calendars",
  args: {},
  options: {
    select_fields: ["id", "name", "calendarType"]
  }
})
```

**Opțiunea C**: Paginare implicită
```javascript
get_calendars({ limit: 10, offset: 0 })
```

### Impact
- **Severitate**: Medium
- **Use case**: Listarea calendarelor pentru selecție ulterioară

---

## Problema 3: Lipsește `search_location_notes`

### Situația Actuală

Există `search_location_tasks` care permite căutarea tuturor task-urilor la nivel de locație:
```javascript
search_location_tasks({ locationId: "xxx" })
// → Returnează toate task-urile
```

Dar pentru notes, există doar `get_contact_notes` care necesită `contactId`:
```javascript
get_contact_notes({ contactId: "xxx" })
// → Returnează notes pentru UN singur contact
```

### Propunere de Soluție

Adaugă tool nou `search_location_notes`:
```javascript
search_location_notes({
  locationId: "eZ39QIzGACEUO3shhPp7",
  limit: 100,
  offset: 0,
  // Opțional:
  contactId: "xxx",
  userId: "xxx",  // cine a creat nota
  dateRange: { start: "...", end: "..." }
})
```

### Impact
- **Severitate**: Medium
- **Use case**: Audit notes, analytics pe activitate echipă

---

## Problema 4: Lipsesc Tools de Agregare/Statistics

### Situația Actuală

Pentru a obține statistici, trebuie să:
1. Fac query cu `limit: 1` doar pentru `meta.total`
2. Sau să citesc toate datele și să numărăm manual

Exemplu ineficient:
```javascript
// Pentru a afla câte conversații sunt de fiecare tip,
// trebuie să citesc toate 68K conversațiile
search_conversations({ limit: 100 })  // și să iterez prin toate
```

### Propunere de Soluție

**Tool 1: `get_conversation_stats`**
```javascript
get_conversation_stats({
  locationId: "xxx",
  dateRange: { start: "...", end: "..." }  // opțional
})
// Returnează:
{
  total: 68256,
  byType: {
    "TYPE_EMAIL": 45000,
    "TYPE_SMS": 12000,
    "TYPE_FACEBOOK": 8000,
    "TYPE_CUSTOM_SMS": 3256
  },
  byDirection: {
    "inbound": 30000,
    "outbound": 38256
  },
  unreadCount: 523
}
```

**Tool 2: `get_custom_field_stats`**
```javascript
get_custom_field_stats({
  fieldKey: "contact.nota_nps",
  // sau fieldId: "xxx"
})
// Returnează:
{
  fieldKey: "contact.nota_nps",
  totalContacts: 107229,
  hasValue: 5420,
  isEmpty: 101809,
  distribution: {
    "10": 2100,
    "9": 1800,
    "8": 900,
    "7": 400,
    "6": 120,
    // ...
  }
}
```

**Tool 3: `get_pipeline_stage_counts`**
```javascript
get_pipeline_stage_counts({
  pipelineId: "XCcnOPUWUSE5XxXLfXBB"
})
// Returnează:
{
  pipelineId: "XCcnOPUWUSE5XxXLfXBB",
  pipelineName: "Main Funnel",
  total: 48716,
  stages: [
    { id: "xxx", name: "P Prospect", count: 38442, percentage: 78.9 },
    { id: "yyy", name: "Q Solicitare S0", count: 5313, percentage: 10.9 },
    // ...
  ]
}
```

**Tool 4: `get_appointment_stats`**
```javascript
get_appointment_stats({
  dateRange: { start: "2025-01-01", end: "2026-01-07" },
  groupBy: "calendar"  // sau "status", "user", "month"
})
// Returnează:
{
  total: 15420,
  byStatus: {
    "confirmed": 12000,
    "cancelled": 2000,
    "no-show": 1420
  },
  byCalendar: {
    "Dr. Cristian Panaite": 2500,
    "Dr. Amalia Arhire": 1800,
    // ...
  }
}
```

### Impact
- **Severitate**: High
- **Use case**: Dashboard analytics, reporting, business intelligence

---

## Problema 5: `execute_pipeline` - Lipsește Agregare În Loop

### Situația Actuală

Loop-ul în `execute_pipeline` returnează un array de rezultate individuale:
```javascript
{
  "steps": [
    { "id": "contacts", "tool_name": "search_contacts", "args": { "limit": 10 } },
    {
      "id": "convos",
      "tool_name": "get_contact_conversations",
      "args": { "contactId": "{{item.id}}" },
      "loop": "{{contacts.contacts}}"
    }
  ]
}
// Returnează:
{
  "convos": [
    { "conversations": [...] },  // pentru contact 1
    { "conversations": [...] },  // pentru contact 2
    // ... 10 obiecte separate
  ]
}
```

Nu există modalitate de a agrega rezultatele (count, sum, avg).

### Propunere de Soluție

Adaugă parametru `aggregate` pentru loop steps:
```javascript
{
  "id": "convo_counts",
  "tool_name": "get_contact_conversations",
  "args": { "contactId": "{{item.id}}" },
  "loop": "{{contacts.contacts}}",
  "aggregate": {
    "type": "sum",           // "count", "sum", "avg", "min", "max"
    "field": "total",        // calea către valoare
    "groupBy": "{{item.source}}"  // opțional
  }
}
// Ar returna:
{
  "convo_counts": {
    "aggregationType": "sum",
    "field": "total",
    "result": 1542,
    // sau cu groupBy:
    "groups": {
      "facebook": 500,
      "google": 800,
      "direct": 242
    }
  }
}
```

### Alte Agregări Utile
```javascript
// Count non-null values
{ "type": "count", "field": "email", "condition": "notNull" }

// Count by value
{ "type": "countBy", "field": "status" }
// → { "open": 50, "closed": 30, "pending": 20 }

// Collect unique values
{ "type": "unique", "field": "tags", "flatten": true }
// → ["tag1", "tag2", "tag3"]
```

### Impact
- **Severitate**: Medium-High
- **Use case**: Agregări complexe fără a returna date mari

---

## Problema 6: Lipsește `get_location_overview` (Dashboard Tool)

### Situația Actuală

Pentru a obține o imagine de ansamblu, trebuie făcute 10+ query-uri separate:
```javascript
search_contacts({ limit: 1 })           // pentru total
search_opportunities({ limit: 1 })       // pentru total
search_conversations({ limit: 1 })       // pentru total
get_pipelines({})                        // pentru lista
// etc.
```

### Propunere de Soluție

Un singur tool care returnează statistici esențiale:
```javascript
get_location_overview({
  locationId: "xxx",  // opțional, folosește default
  include: ["contacts", "opportunities", "conversations", "calendars", "workflows"]
})
// Returnează:
{
  location: {
    id: "eZ39QIzGACEUO3shhPp7",
    name: "Clinica Kilostop",
    timezone: "Europe/Bucharest"
  },
  contacts: {
    total: 107229,
    byType: { "lead": 107229 },
    addedLast30Days: 2500,
    withEmail: 95000,
    withPhone: 45000
  },
  opportunities: {
    total: 57171,
    byStatus: { "open": 50000, "won": 5000, "lost": 2171 },
    byPipeline: {
      "Main Funnel": 48716,
      "Reactivare": 7778,
      // ...
    }
  },
  conversations: {
    total: 68256,
    unread: 523,
    byType: { "TYPE_EMAIL": 45000, "TYPE_SMS": 15000, ... }
  },
  calendars: {
    total: 46,
    appointmentsToday: 25,
    appointmentsThisWeek: 120
  },
  workflows: {
    total: 100,
    active: 45,
    draft: 55
  }
}
```

### Impact
- **Severitate**: Medium
- **Use case**: Dashboard rapid, health check, onboarding

---

## Sumar Priorități

| Problemă | Severitate | Efort Estimat | Prioritate |
|----------|------------|---------------|------------|
| Stats/Aggregation Tools | High | Medium | 🔴 P1 |
| `get_calendar_events` fără filtre obligatorii | High | Low | 🔴 P1 |
| `execute_pipeline` aggregare în loop | Medium-High | Medium | 🟠 P2 |
| `get_calendars` output size | Medium | Low | 🟠 P2 |
| `search_location_notes` | Medium | Low | 🟡 P3 |
| `get_location_overview` | Medium | Medium | 🟡 P3 |

---

## Note Implementare

### Ce a Mers Bine (de păstrat)
- `execute_pipeline` - excelent pentru queries paralele secvențiale
- `return_mode: summary` - reduce context foarte bine pentru most tools
- `[*]` wildcard în proiecții - foarte util pentru extragere date din arrays
- `search_contacts` fără parametri - returnează și `total` în meta

### Fișiere Relevante pentru Implementare
- `src/tools/calendar-tools.ts` - pentru calendar improvements
- `src/tools/conversation-tools.ts` - pentru conversation stats
- `src/tools/contact-tools.ts` - pentru notes search
- `src/server.ts` - pentru `execute_pipeline` aggregation
- Posibil nou: `src/tools/stats-tools.ts` - pentru toate aggregation tools

---

*Document pregătit pentru evaluare și implementare de către un agent specializat.*
