# GHL MCP Server - Development Plan

## Vision

Transform the GoHighLevel MCP Server from a simple tool catalog to a **context-efficient execution engine** that supports complex multi-step workflows without polluting LLM context with intermediate results.

## Current State (Completed)

- ✅ Progressive disclosure implemented (254 → 5 tools exposed)
- ✅ Meta-tools: `search_tools`, `describe_tools`, `execute_tool`, `list_domains`
- ✅ Tool registry with adapter pattern
- ✅ ~96% token reduction achieved

## Gap Analysis

| Feature | Status | Impact |
|---------|--------|--------|
| Tool discovery | ✅ Done | High |
| On-demand schemas | ✅ Done | High |
| Basic execution | ✅ Done | High |
| **Result projection** | ❌ Missing | Critical |
| **Server-side filtering** | ❌ Missing | Critical |
| **Multi-step pipelines** | ❌ Missing | High |
| **Batch operations** | ❌ Missing | Medium |

---

## Phase Overview

| Phase | Name | Focus | Dependencies |
|-------|------|-------|--------------|
| 1 | Enhanced Execute | Add options to `execute_tool` | None |
| 2 | Pipeline Execution | Multi-step server-side workflows | Phase 1 |
| 3 | Batch Operations | Bulk processing with throttling | Phase 1 |
| 4 | Testing & Docs | Integration tests, documentation | Phases 1-3 |

---

## Phase 1: Enhanced Execute Tool

**Goal:** Reduce context pollution by adding projection, filtering, and return modes to `execute_tool`.

### Tasks

1. **Extend `execute_tool` schema**
   - Add `options` parameter with `select_fields`, `limit`, `filter`, `return_mode`
   - Update meta-tools.ts

2. **Implement field projection**
   - Extract only requested fields from results
   - Handle nested objects
   - Support dot notation (e.g., `contact.tags`)

3. **Implement result limiting**
   - Server-side limit on array results
   - Pagination cursor support

4. **Implement return modes**
   - `inline`: Return data directly (default, current behavior)
   - `summary`: Return count + sample (3 items max)
   - `file`: Write to temp file, return path

5. **Implement server-side filtering**
   - Simple expression parser (`field OPERATOR value`)
   - Supported operators: `=`, `!=`, `>`, `<`, `CONTAINS`, `STARTS_WITH`, `IS_NULL`, `IS_NOT_NULL`

### Acceptance Criteria
- See `phases/phase-1.json`

---

## Phase 2: Pipeline Execution

**Goal:** Execute multi-step workflows server-side, returning only final results.

### Tasks

1. **Design pipeline schema**
   - Step definitions with tool name and args
   - Variable references between steps (`{{step_id.field}}`)
   - Conditional execution
   - Delays between steps

2. **Create `execute_pipeline` tool**
   - Add to meta-tools.ts
   - Define input schema with steps array
   - Define return template

3. **Implement pipeline executor**
   - Sequential step execution
   - Variable interpolation
   - Error handling and rollback strategy
   - Timeout management

4. **Implement step result chaining**
   - Store step results in context
   - Resolve variable references
   - Support array indexing (`{{contacts[0].id}}`)

### Acceptance Criteria
- See `phases/phase-2.json`

---

## Phase 3: Batch Operations

**Goal:** Process multiple items efficiently with rate limiting.

### Tasks

1. **Create `execute_batch` tool**
   - Single tool executed on multiple items
   - Configurable concurrency
   - Rate limiting (respect GHL API limits)

2. **Implement batch executor**
   - Parallel execution with limit
   - Retry logic for failed items
   - Progress tracking

3. **Result aggregation**
   - Summary mode: counts and errors only
   - Detail mode: all results (with projection)
   - Error collection

### Acceptance Criteria
- See `phases/phase-3.json`

---

## Phase 4: Testing & Documentation

**Goal:** Ensure reliability and provide clear usage guides.

### Tasks

1. **Unit tests**
   - Field projection
   - Filter expression parser
   - Variable interpolation
   - Batch executor

2. **Integration tests**
   - Full pipeline execution
   - Error scenarios
   - Rate limiting behavior

3. **Documentation**
   - Update implementation report
   - Usage examples for each new feature
   - Migration guide from basic execute_tool

### Acceptance Criteria
- See `phases/phase-4.json`

---

## Technical Notes

### File Changes Expected

```
src/
├── registry/
│   └── tool-registry.ts     # Add projection, filtering
├── tools/
│   └── meta-tools.ts        # Add execute_pipeline, execute_batch
├── execution/               # NEW
│   ├── field-projector.ts   # Field selection logic
│   ├── result-filter.ts     # Filter expression parser
│   ├── pipeline-executor.ts # Multi-step execution
│   ├── batch-executor.ts    # Batch processing
│   └── variable-resolver.ts # Template variable resolution
└── server.ts                # Minor updates
```

### GHL API Rate Limits

- Standard: 100 requests/minute
- Batch operations should respect this
- Implement exponential backoff

---

## Success Metrics

| Metric | Before | After Phase 2 | Target |
|--------|--------|---------------|--------|
| Context pollution (complex workflow) | ~50KB | ~2KB | <5KB |
| Tool calls for 3-step workflow | 6-9 | 1 | 1 |
| Intermediate results in context | Yes | No | No |

---

*Plan created: 2026-01-07*
*Branch: feat/grouped-tools*
