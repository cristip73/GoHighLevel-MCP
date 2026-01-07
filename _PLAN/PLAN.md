# GHL MCP Server - Improvement Proposals Implementation Plan

> **PRD**: `_DOCS/_REPORTS/ghl-mcp-improvement-proposals.md`
> **Data**: 7 Ianuarie 2026
> **Branch**: `feat/improvement-proposals`

---

## Context

Plan de implementare pentru îmbunătățirile identificate în sesiunea de research pe baza de date GHL Kilostop (107K contacte, 57K oportunități, 68K conversații).

### Constatări din Research API GHL

| Problemă din PRD | Suport GHL API | Concluzie |
|------------------|----------------|-----------|
| Calendar events fără filtru obligatoriu | ❌ API necesită userId/calendarId/groupId | Wrapper care listează calendare și agregă |
| Statistics/Aggregation | ❌ Nu există endpoints native | Calculare client-side în MCP server |
| Location-level notes | ❌ Doar per-contact (`/contacts/:id/notes`) | Pipeline-based sau iterare |
| Dashboard overview | ❌ Nu există endpoint | Composite tool cu multiple API calls |
| Pipeline loop aggregation | N/A (intern MCP) | Extindere pipeline executor |

---

## Faze de Implementare

| Fază | Nume | Prioritate | Dependențe |
|------|------|------------|------------|
| 1 | Pipeline Aggregation | P1 | - |
| 2 | Stats Tools | P1 | - |
| 3 | Calendar Enhancement | P1-P2 | - |
| 4 | Location Overview | P3 | Faza 2 |
| 5 | Notes Aggregation | P3 | Faza 1 |

**Fazele 1, 2, 3 pot rula în paralel.**

---

## Faza 1: Pipeline Aggregation Enhancement

**Goal**: Adaugă suport pentru agregări în `execute_pipeline` loop steps pentru a reduce output-ul și a calcula statistici server-side.

### Tasks

1. Extinde interfața `PipelineStep` cu parametru `aggregate`
2. Implementează operațiile de agregare:
   - `count` - număr elemente
   - `sum` - sumă pe un field numeric
   - `avg` - medie pe un field numeric
   - `min` / `max` - valori extreme
   - `countBy` - count grupat pe valori distincte
   - `unique` - colectare valori unice
3. Implementează `groupBy` pentru agregări pe categorii
4. Update variable-resolver pentru a recunoaște aggregate results
5. Adaugă teste pentru toate operațiile

### Fișiere Afectate

- `src/execution/pipeline-executor.ts`
- `src/execution/aggregator.ts` (NOU)
- `src/registry/types.ts`
- `tests/pipeline-aggregation.test.ts` (NOU)

### Acceptance Criteria

Vezi `phases/phase-1.json`

---

## Faza 2: Stats Tools

**Goal**: Creează tools noi pentru statistici calculate server-side folosind API calls existente + agregare.

### Tasks

1. Creează `src/tools/stats-tools.ts` cu clasă `StatsTools`
2. Implementează `get_conversation_stats`:
   - Folosește search_conversations iterativ
   - Returnează: total, byType, byDirection, unreadCount
3. Implementează `get_pipeline_stage_counts`:
   - Folosește get_opportunities cu paginare
   - Returnează: total, stages[] cu count și percentage
4. Implementează `get_appointment_stats`:
   - Iterează calendare și agregă evenimente
   - Returnează: total, byStatus, byCalendar, byMonth
5. Implementează `get_contact_stats`:
   - Folosește search_contacts cu filtre
   - Returnează: total, withEmail, withPhone, bySource
6. Înregistrează în tool registry
7. Adaugă documentație în tool descriptions

### Fișiere Afectate

- `src/tools/stats-tools.ts` (NOU)
- `src/registry/tool-registry.ts`
- `tests/stats-tools.test.ts` (NOU)

### Acceptance Criteria

Vezi `phases/phase-2.json`

---

## Faza 3: Calendar Enhancement

**Goal**: Îmbunătățește calendar tools pentru operații la nivel de locație fără filtru obligatoriu.

### Tasks

1. Adaugă tool `get_all_calendar_events`:
   - Listează toate calendarele din locație
   - Iterează și colectează evenimente din fiecare
   - Suportă date range (startTime, endTime)
   - Agregă rezultatele într-un singur response
   - Rate limiting pentru a nu depăși 100 req/min
2. Adaugă opțiune `compact: true` pentru `get_calendars`:
   - Returnează doar: id, name, calendarType, isActive
   - Reduce output de la ~1.2MB la ~10KB
3. Adaugă paginare la `get_calendars` (limit/offset)
4. Update documentație tool descriptions

### Fișiere Afectate

- `src/tools/calendar-tools.ts`
- `tests/calendar-tools.test.ts`

### Acceptance Criteria

Vezi `phases/phase-3.json`

---

## Faza 4: Location Overview Dashboard

**Goal**: Un singur tool care returnează statistici esențiale pentru dashboard rapid.

### Tasks

1. Adaugă `get_location_overview` în StatsTools:
   - Parametru `include`: array de secțiuni dorite
   - Secțiuni: contacts, opportunities, conversations, calendars, workflows
2. Implementează agregare paralelă pentru performance:
   - Folosește Promise.all pentru queries independente
   - Timeout per secțiune pentru resilience
3. Returnează structură:
   ```json
   {
     "location": { "id", "name", "timezone" },
     "contacts": { "total", "withEmail", "withPhone", "addedLast30Days" },
     "opportunities": { "total", "byStatus", "byPipeline" },
     "conversations": { "total", "unread", "byType" },
     "calendars": { "total", "appointmentsToday", "appointmentsThisWeek" }
   }
   ```
4. Adaugă caching opțional (TTL configurabil)

### Fișiere Afectate

- `src/tools/stats-tools.ts`
- `tests/stats-tools.test.ts`

### Acceptance Criteria

Vezi `phases/phase-4.json`

---

## Faza 5: Notes Location Search

**Goal**: Documentație și tool opțional pentru agregare notes la nivel de locație.

### Tasks

1. Documentează limitarea API GHL (notes doar per-contact)
2. Creează recipe în documentație pentru pipeline-based notes aggregation
3. Opțional: Adaugă helper `search_recent_notes`:
   - Primește contactIds sau folosește search_contacts recent
   - Iterează și colectează notes
   - Warning în response despre limitări de performanță
4. Adaugă test pentru workflow-ul documentat

### Fișiere Afectate

- `docs/recipes/location-notes-aggregation.md` (NOU)
- `src/tools/contact-tools.ts` (opțional)

### Acceptance Criteria

Vezi `phases/phase-5.json`

---

## Diagrama Dependențelor

```
┌─────────────────────────────────────────────────────────┐
│                    PARALEL (Independente)               │
├─────────────────────────────────────────────────────────┤
│  Faza 1                Faza 2              Faza 3       │
│  Pipeline Aggregation  Stats Tools         Calendar    │
│         │                   │                          │
└─────────│───────────────────│──────────────────────────┘
          │                   │
          │                   ▼
          │           ┌──────────────┐
          │           │   Faza 4     │
          │           │   Overview   │
          │           └──────────────┘
          │
          ▼
   ┌──────────────┐
   │   Faza 5     │
   │   Notes      │
   └──────────────┘
```

---

## Out of Scope (Limitări GHL API)

Următoarele NU sunt posibile datorită API GHL:

1. **Calendar events globale** - API necesită userId/calendarId/groupId (workaround: iterare)
2. **Custom field value distribution** - necesită citirea tuturor contactelor
3. **Native statistics endpoints** - nu există, trebuie calculate
4. **Notes la nivel de locație** - doar per-contact endpoint

---

## Success Metrics

| Fază | Criteriu Principal |
|------|-------------------|
| 1 | `aggregate: {type: "sum"}` în pipeline returnează număr, nu array |
| 2 | `get_conversation_stats` returnează breakdown în <5s |
| 3 | `get_all_calendar_events` funcționează fără userId/calendarId |
| 4 | `get_location_overview` returnează dashboard în <10s |
| 5 | Documentație clară pentru notes aggregation |

---

## Riscuri și Mitigări

| Risc | Impact | Mitigare |
|------|--------|----------|
| Rate limiting GHL (100 req/min) | High | Concurrency control în loops |
| Output prea mare pentru stats | Medium | return_mode: summary |
| Performance pentru locații mari | High | Limits, pagination, caching |
| Timeout pe location overview | Medium | Per-section timeout + partial results |

---

*Plan creat: 7 Ianuarie 2026*
