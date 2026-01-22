/**
 * Execution Module - Result transformation, pipeline, and batch utilities
 *
 * Provides:
 * - Field projection and filtering for execute_tool options
 * - Variable resolution for pipeline step arguments
 * - Pipeline execution for multi-step workflows
 * - Batch execution for bulk operations with rate limiting
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
  type StepExecutionResult,
  type ToolExecutor
} from './pipeline-executor.js';

// Batch execution (Phase 3)
export {
  executeBatch,
  validateBatchRequest,
  type BatchToolExecutor,
  type BatchOptions,
  type BatchRequest,
  type BatchResult,
  type BatchSummaryResult,
  type BatchDetailResult,
  type ItemResult
} from './batch-executor.js';

export {
  RateLimiter,
  GHL_RATE_LIMIT_CONFIG,
  calculateBackoff,
  getSharedRateLimiter,
  resetSharedRateLimiter,
  type RateLimiterConfig
} from './rate-limiter.js';
