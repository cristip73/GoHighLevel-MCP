/**
 * Execution Module - Result transformation and pipeline utilities
 *
 * Provides:
 * - Field projection and filtering for execute_tool options
 * - Variable resolution for pipeline step arguments
 * - Pipeline execution for multi-step workflows
 */

export { applyProjection, getValueByPath, projectFields, projectArray } from './field-projector.js';
export { applyFilter, parseFilter, matchesFilter, filterArray, type ParsedFilter } from './result-filter.js';
export { applyReturnMode, applySummaryMode, applyFileMode, type SummaryResult, type FileResult } from './return-modes.js';

// Pipeline execution (Phase 2)
export {
  resolveVariables,
  resolveVariable,
  resolveString,
  findVariables,
  parseVariable,
  hasUnresolvedVariables,
  getReferencedSteps,
  type ParsedVariable,
  type PipelineContext
} from './variable-resolver.js';

export {
  executePipeline,
  validatePipeline,
  applyReturnTemplate,
  type PipelineStep,
  type PipelineRequest,
  type PipelineResult,
  type ReturnTemplate,
  type StepResult,
  type StepError,
  type ToolExecutor
} from './pipeline-executor.js';
