/**
 * Execution Module - Result transformation utilities
 *
 * Provides field projection, filtering, and return mode handling
 * for execute_tool options.
 */

export { applyProjection, getValueByPath, projectFields, projectArray } from './field-projector.js';
export { applyFilter, parseFilter, matchesFilter, filterArray, type ParsedFilter } from './result-filter.js';
export { applyReturnMode, applySummaryMode, applyFileMode, type SummaryResult, type FileResult } from './return-modes.js';
