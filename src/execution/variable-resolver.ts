/**
 * Variable Resolver - Template variable resolution for pipeline execution
 *
 * Resolves {{step_id.field}} references in pipeline step arguments.
 * Supports:
 * - Simple references: {{step1.id}}
 * - Nested paths: {{step1.contact.email}}
 * - Array indexing: {{step1[0].id}}, {{step1.items[0].name}}
 */

import { getValueByPath } from './field-projector.js';

/**
 * Parsed variable reference
 */
export interface ParsedVariable {
  /** Full match including braces: {{step1.field}} */
  fullMatch: string;
  /** Step ID referenced */
  stepId: string;
  /** Path within the step result (may be empty for full result) */
  path: string;
}

/**
 * Pipeline execution context storing step results
 */
export interface PipelineContext {
  [stepId: string]: unknown;
}

/**
 * Regex to match variable references: {{stepId.path}} or {{stepId[0].path}}
 * Captures: stepId and optional path
 */
const VARIABLE_REGEX = /\{\{([a-zA-Z_][a-zA-Z0-9_]*)(\.[^}]+|\[[^\]]+\][^}]*)?\}\}/g;

/**
 * Parse a single variable reference string
 *
 * @param variable - Variable string like "{{step1.field}}" or "{{step1[0].name}}"
 * @returns Parsed variable or null if invalid
 */
export function parseVariable(variable: string): ParsedVariable | null {
  // Reset regex lastIndex for fresh match
  const regex = /^\{\{([a-zA-Z_][a-zA-Z0-9_]*)(\.[^}]+|\[[^\]]+\][^}]*)?\}\}$/;
  const match = regex.exec(variable);

  if (!match) {
    return null;
  }

  const stepId = match[1];
  // Path includes the leading dot or bracket, remove leading dot if present
  let path = match[2] || '';
  if (path.startsWith('.')) {
    path = path.slice(1);
  }

  return {
    fullMatch: variable,
    stepId,
    path
  };
}

/**
 * Find all variable references in a string
 *
 * @param str - String potentially containing {{var}} references
 * @returns Array of parsed variables found
 */
export function findVariables(str: string): ParsedVariable[] {
  if (typeof str !== 'string') {
    return [];
  }

  const variables: ParsedVariable[] = [];
  let match: RegExpExecArray | null;

  // Reset regex
  VARIABLE_REGEX.lastIndex = 0;

  while ((match = VARIABLE_REGEX.exec(str)) !== null) {
    const stepId = match[1];
    let path = match[2] || '';
    if (path.startsWith('.')) {
      path = path.slice(1);
    }

    variables.push({
      fullMatch: match[0],
      stepId,
      path
    });
  }

  return variables;
}

/**
 * Resolve a single variable reference against the pipeline context
 *
 * @param variable - Parsed variable reference
 * @param context - Pipeline context with step results
 * @returns Resolved value or undefined if not found
 */
export function resolveVariable(
  variable: ParsedVariable,
  context: PipelineContext
): unknown {
  const stepResult = context[variable.stepId];

  if (stepResult === undefined) {
    return undefined;
  }

  // If no path, return the full step result
  if (!variable.path) {
    return stepResult;
  }

  // Use the existing getValueByPath from field-projector
  return getValueByPath(stepResult, variable.path);
}

/**
 * Resolve all variables in a string value
 *
 * @param str - String with potential {{var}} references
 * @param context - Pipeline context
 * @returns String with variables replaced, or the raw value if single variable
 */
export function resolveString(str: string, context: PipelineContext): unknown {
  const variables = findVariables(str);

  if (variables.length === 0) {
    return str;
  }

  // If the entire string is a single variable, return the resolved value directly
  // This preserves type (number, object, array, etc.)
  if (variables.length === 1 && variables[0].fullMatch === str) {
    return resolveVariable(variables[0], context);
  }

  // Multiple variables or mixed content: string interpolation
  let result = str;
  for (const variable of variables) {
    const resolved = resolveVariable(variable, context);
    const replacement = resolved === undefined ? '' : String(resolved);
    result = result.replace(variable.fullMatch, replacement);
  }

  return result;
}

/**
 * Recursively resolve all variables in an object/array structure
 *
 * @param value - Value to resolve (can be object, array, string, or primitive)
 * @param context - Pipeline context with step results
 * @returns Value with all variables resolved
 */
export function resolveVariables(
  value: unknown,
  context: PipelineContext
): unknown {
  // Null/undefined pass through
  if (value === null || value === undefined) {
    return value;
  }

  // String: resolve variables
  if (typeof value === 'string') {
    return resolveString(value, context);
  }

  // Array: resolve each element
  if (Array.isArray(value)) {
    return value.map(item => resolveVariables(item, context));
  }

  // Object: resolve each property value
  if (typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      result[key] = resolveVariables(val, context);
    }
    return result;
  }

  // Primitives (number, boolean) pass through
  return value;
}

/**
 * Check if a value contains any unresolved variables
 *
 * @param value - Value to check
 * @returns true if any {{var}} patterns remain
 */
export function hasUnresolvedVariables(value: unknown): boolean {
  if (typeof value === 'string') {
    // Use fresh regex to avoid lastIndex issues
    const regex = /\{\{([a-zA-Z_][a-zA-Z0-9_]*)(\.[^}]+|\[[^\]]+\][^}]*)?\}\}/;
    return regex.test(value);
  }

  if (Array.isArray(value)) {
    return value.some(item => hasUnresolvedVariables(item));
  }

  if (typeof value === 'object' && value !== null) {
    return Object.values(value).some(val => hasUnresolvedVariables(val));
  }

  return false;
}

/**
 * Get list of step IDs referenced in a value
 *
 * @param value - Value to scan for references
 * @returns Array of unique step IDs referenced
 */
export function getReferencedSteps(value: unknown): string[] {
  const stepIds = new Set<string>();

  function scan(v: unknown): void {
    if (typeof v === 'string') {
      const variables = findVariables(v);
      for (const variable of variables) {
        stepIds.add(variable.stepId);
      }
    } else if (Array.isArray(v)) {
      v.forEach(scan);
    } else if (typeof v === 'object' && v !== null) {
      Object.values(v).forEach(scan);
    }
  }

  scan(value);
  return Array.from(stepIds);
}
