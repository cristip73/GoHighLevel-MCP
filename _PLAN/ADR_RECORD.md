# Architecture Decision Records

## Phase 1: Enhanced Execute Tool

### ADR-001: Modular Execution Pipeline

**Context:** Need to add result transformation (projection, filtering, limiting, return modes) to execute_tool without complicating the main meta-tools.ts file.

**Decision:** Create separate modules in `src/execution/`:
- `field-projector.ts` - field selection logic
- `result-filter.ts` - filter expression parser
- `return-modes.ts` - summary and file modes
- `index.ts` - centralized exports

**Rationale:**
- Single Responsibility Principle - each module handles one transformation
- Testable in isolation - 60 unit tests for execution modules
- Reusable in Phase 2 (pipelines) and Phase 3 (batch)

**Trade-off:** Slight overhead from module boundaries, but worth it for maintainability.

---

### ADR-002: Transformation Order

**Context:** Multiple options can be applied together. What order?

**Decision:** `filter → limit → project → return_mode`

**Rationale:**
1. Filter first - reduces dataset before other operations
2. Limit second - controls count before projection
3. Project third - removes fields from limited set
4. Return mode last - applies to final result

This order minimizes data processed at each step.

---

### ADR-003: Filter Expression Syntax

**Context:** How should users specify filters?

**Decision:** Simple string syntax: `"field OPERATOR value"`

**Alternatives considered:**
- JSON object `{field: "status", op: "=", value: "active"}` - more verbose
- Array syntax `["status", "=", "active"]` - less readable

**Rationale:**
- Human-readable and LLM-friendly
- Easy to parse with regex
- Matches SQL-like intuition
- 8 operators cover common use cases without complexity

---

### ADR-004: Return Mode File Location

**Context:** Where to write files for `return_mode: "file"`?

**Decision:** System temp directory: `os.tmpdir()/ghl-mcp-results/`

**Rationale:**
- Cross-platform compatible
- Auto-cleanup by OS
- No permission issues
- Unique filenames with timestamp + random suffix prevent collisions

---

### ADR-005: Limit Validation

**Context:** What happens with negative limit values?

**Decision:** Normalize to non-negative integer: `Math.max(0, Math.floor(limit))`

**Rationale:**
- Defensive programming - no surprising behavior
- Negative values become 0 (empty result, not error)
- Floats become integers
- Discovered during code review - better to handle edge cases gracefully
