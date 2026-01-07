/**
 * Result Filter - Server-side filtering for execute_tool results
 *
 * Parses filter expressions in format: "field OPERATOR value"
 * Operators: =, !=, >, <, CONTAINS, STARTS_WITH, IS_NULL, IS_NOT_NULL
 */

import { getValueByPath } from './field-projector.js';
import { FilterOperator } from '../registry/types.js';

/**
 * Parsed filter expression
 */
export interface ParsedFilter {
  field: string;
  operator: FilterOperator;
  value: string | null;
}

/**
 * Supported operators with their string representations
 */
const OPERATORS: FilterOperator[] = [
  'IS_NOT_NULL',  // Check longer ones first
  'IS_NULL',
  'STARTS_WITH',
  'CONTAINS',
  '!=',
  '=',
  '>',
  '<'
];

/**
 * Parse a filter expression string
 *
 * Format: "field OPERATOR value"
 * Examples:
 *   - "status = active"
 *   - "email CONTAINS @gmail.com"
 *   - "phone IS_NOT_NULL"
 *   - "age > 18"
 *
 * @param expression - Filter expression string
 * @returns Parsed filter or null if invalid
 */
export function parseFilter(expression: string): ParsedFilter | null {
  if (!expression || typeof expression !== 'string') {
    return null;
  }

  const trimmed = expression.trim();

  // Find the operator in the expression
  for (const op of OPERATORS) {
    // For word operators, ensure they're surrounded by spaces or at end
    const pattern = op.includes('_') || op.length > 2
      ? new RegExp(`\\s+${op}(?:\\s+|$)`, 'i')
      : new RegExp(`\\s*${escapeRegex(op)}\\s*`);

    const match = trimmed.match(pattern);
    if (match && match.index !== undefined) {
      const field = trimmed.slice(0, match.index).trim();
      const valueStart = match.index + match[0].length;
      const value = trimmed.slice(valueStart).trim();

      // IS_NULL and IS_NOT_NULL don't have values
      if (op === 'IS_NULL' || op === 'IS_NOT_NULL') {
        return { field, operator: op, value: null };
      }

      // Other operators require a value
      if (!value) {
        return null;
      }

      return { field, operator: op as FilterOperator, value };
    }
  }

  return null;
}

/**
 * Escape regex special characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Evaluate a filter against a single item
 *
 * @param item - Object to test
 * @param filter - Parsed filter expression
 * @returns true if item matches filter
 */
export function matchesFilter(item: unknown, filter: ParsedFilter): boolean {
  if (item === null || item === undefined || typeof item !== 'object') {
    return false;
  }

  const fieldValue = getValueByPath(item, filter.field);

  switch (filter.operator) {
    case 'IS_NULL':
      return fieldValue === null || fieldValue === undefined;

    case 'IS_NOT_NULL':
      return fieldValue !== null && fieldValue !== undefined;

    case '=':
      return compareEqual(fieldValue, filter.value);

    case '!=':
      return !compareEqual(fieldValue, filter.value);

    case '>':
      return compareGreater(fieldValue, filter.value);

    case '<':
      return compareLess(fieldValue, filter.value);

    case 'CONTAINS':
      return containsValue(fieldValue, filter.value);

    case 'STARTS_WITH':
      return startsWithValue(fieldValue, filter.value);

    default:
      return false;
  }
}

/**
 * Compare equality (handles type coercion)
 */
function compareEqual(fieldValue: unknown, filterValue: string | null): boolean {
  if (filterValue === null) {
    return fieldValue === null || fieldValue === undefined;
  }

  // String comparison (case-insensitive)
  if (typeof fieldValue === 'string') {
    return fieldValue.toLowerCase() === filterValue.toLowerCase();
  }

  // Number comparison
  if (typeof fieldValue === 'number') {
    const numValue = parseFloat(filterValue);
    return !isNaN(numValue) && fieldValue === numValue;
  }

  // Boolean comparison
  if (typeof fieldValue === 'boolean') {
    return fieldValue === (filterValue.toLowerCase() === 'true');
  }

  // Array contains value
  if (Array.isArray(fieldValue)) {
    return fieldValue.some(v =>
      typeof v === 'string'
        ? v.toLowerCase() === filterValue.toLowerCase()
        : v === filterValue
    );
  }

  return String(fieldValue) === filterValue;
}

/**
 * Compare greater than
 */
function compareGreater(fieldValue: unknown, filterValue: string | null): boolean {
  if (filterValue === null) return false;

  if (typeof fieldValue === 'number') {
    const numValue = parseFloat(filterValue);
    return !isNaN(numValue) && fieldValue > numValue;
  }

  if (typeof fieldValue === 'string') {
    return fieldValue.localeCompare(filterValue) > 0;
  }

  // Date comparison
  if (fieldValue instanceof Date) {
    const dateValue = new Date(filterValue);
    return !isNaN(dateValue.getTime()) && fieldValue > dateValue;
  }

  return false;
}

/**
 * Compare less than
 */
function compareLess(fieldValue: unknown, filterValue: string | null): boolean {
  if (filterValue === null) return false;

  if (typeof fieldValue === 'number') {
    const numValue = parseFloat(filterValue);
    return !isNaN(numValue) && fieldValue < numValue;
  }

  if (typeof fieldValue === 'string') {
    return fieldValue.localeCompare(filterValue) < 0;
  }

  // Date comparison
  if (fieldValue instanceof Date) {
    const dateValue = new Date(filterValue);
    return !isNaN(dateValue.getTime()) && fieldValue < dateValue;
  }

  return false;
}

/**
 * Check if field contains value (case-insensitive)
 */
function containsValue(fieldValue: unknown, filterValue: string | null): boolean {
  if (filterValue === null) return false;

  if (typeof fieldValue === 'string') {
    return fieldValue.toLowerCase().includes(filterValue.toLowerCase());
  }

  if (Array.isArray(fieldValue)) {
    return fieldValue.some(v =>
      typeof v === 'string'
        ? v.toLowerCase().includes(filterValue.toLowerCase())
        : String(v).includes(filterValue)
    );
  }

  return String(fieldValue).toLowerCase().includes(filterValue.toLowerCase());
}

/**
 * Check if field starts with value (case-insensitive)
 */
function startsWithValue(fieldValue: unknown, filterValue: string | null): boolean {
  if (filterValue === null) return false;

  if (typeof fieldValue === 'string') {
    return fieldValue.toLowerCase().startsWith(filterValue.toLowerCase());
  }

  return String(fieldValue).toLowerCase().startsWith(filterValue.toLowerCase());
}

/**
 * Apply filter to an array of items
 *
 * @param items - Array to filter
 * @param filter - Parsed filter expression
 * @returns Filtered array
 */
export function filterArray(items: unknown[], filter: ParsedFilter): unknown[] {
  return items.filter(item => matchesFilter(item, filter));
}

/**
 * Apply filter expression to a result
 * Handles both single objects and arrays
 *
 * @param result - Tool execution result
 * @param filterExpr - Filter expression string (if empty, return as-is)
 * @returns Filtered result
 */
export function applyFilter(
  result: unknown,
  filterExpr: string | undefined
): { result: unknown; error?: string } {
  if (!filterExpr) {
    return { result };
  }

  const parsed = parseFilter(filterExpr);
  if (!parsed) {
    return {
      result,
      error: `Invalid filter expression: "${filterExpr}". Format: "field OPERATOR value". Operators: =, !=, >, <, CONTAINS, STARTS_WITH, IS_NULL, IS_NOT_NULL`
    };
  }

  if (Array.isArray(result)) {
    return { result: filterArray(result, parsed) };
  }

  // For single objects, return the object if it matches, null otherwise
  if (typeof result === 'object' && result !== null) {
    return {
      result: matchesFilter(result, parsed) ? result : null
    };
  }

  // Primitives can't be filtered
  return { result };
}
