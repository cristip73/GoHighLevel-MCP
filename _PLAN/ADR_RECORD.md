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

---

## Phase 2: Pipeline Execution

### ADR-006: Variable Template Syntax

**Context:** How should pipeline steps reference results from previous steps?

**Decision:** Mustache-like double braces: `{{step_id.field}}` and `{{step_id[0].field}}`

**Alternatives considered:**
- `$step_id.field` - conflict with shell/env variables
- `{step_id.field}` - conflict with JSON objects
- `%step_id.field%` - less intuitive

**Rationale:**
- Mustache is widely recognized
- No conflict with JSON, JavaScript, or shell
- LLMs are familiar with this pattern
- Easy to parse with regex

---

### ADR-007: Reuse Field Projector for Variable Resolution

**Context:** Pipeline needs to resolve paths like `{{search.contact.email}}` and `{{contacts[0].id}}`.

**Decision:** Reuse `getValueByPath()` from `field-projector.ts` in `variable-resolver.ts`.

**Rationale:**
- DRY - same path resolution logic
- Already tested (18 unit tests)
- Consistent behavior across projection and variable resolution

---

### ADR-008: Step Results Structure

**Context:** What data to include in `step_results` for partial recovery on failure?

**Decision:** Include full result data:
```typescript
interface StepExecutionResult {
  success: boolean;
  duration_ms: number;
  result?: unknown;  // Complete result for recovery
}
```

**Initial approach:** Only `{success, duration_ms}` - but code review flagged this as insufficient for "partial results" requirement.

**Rationale:**
- Allows downstream recovery if pipeline fails mid-way
- Useful for debugging
- Small overhead since data was already computed

---

### ADR-009: Pipeline Timeout Strategy

**Context:** Pipelines could hang indefinitely on slow tools.

**Decision:** Check timeout before each step starts (not interrupt mid-step).

**Rationale:**
- Simpler than Promise.race with AbortController
- Tool execution is atomic - don't interrupt mid-call
- Default 2 min is generous for typical workflows
- Max 5 min prevents abuse

**Trade-off:** A slow step can exceed timeout by up to the step's execution time. Acceptable for MVP.

---

### ADR-010: Skip Conditional Execution

**Context:** PLAN.md mentioned "conditional execution" but phase-2.json criteria don't require it.

**Decision:** Skip for Phase 2, defer to future enhancement.

**Rationale:**
- Not in acceptance criteria
- Adds complexity (need expression evaluator)
- Can be simulated with filter step + empty array handling
- Focus on delivering core value first

---

### ADR-011: Max 20 Steps Limit

**Context:** How many steps should a pipeline support?

**Decision:** Hard limit of 20 steps.

**Rationale:**
- Safety against abuse/infinite loops
- Real workflows rarely exceed 5-10 steps
- Timeout provides additional protection
- Easy to increase later if needed
