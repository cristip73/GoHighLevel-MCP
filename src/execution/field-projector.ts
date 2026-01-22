/**
 * Field Projector - Extract specific fields from results
 *
 * Supports:
 * - Simple field names: "id", "name"
 * - Dot notation for nested: "contact.email", "address.city"
 * - Array indexing: "tags[0]", "contacts[0].name"
 * - Array wildcard: "contacts[*].email" (extracts field from all elements)
 */

/**
 * Get a value from an object using a path string
 * Supports dot notation and array indexing
 *
 * @param obj - Source object
 * @param path - Path like "contact.email" or "tags[0]"
 * @returns The value at path or undefined
 */
export function getValueByPath(obj: unknown, path: string): unknown {
  if (obj === null || obj === undefined) {
    return undefined;
  }

  // Parse path into segments
  const segments = parsePath(path);
  let current: unknown = obj;

  for (const segment of segments) {
    if (current === null || current === undefined) {
      return undefined;
    }

    if (segment.type === 'property') {
      if (typeof current !== 'object') {
        return undefined;
      }
      current = (current as Record<string, unknown>)[segment.key];
    } else if (segment.type === 'index') {
      if (!Array.isArray(current)) {
        return undefined;
      }
      current = current[segment.index];
    } else if (segment.type === 'wildcard') {
      if (!Array.isArray(current)) {
        return undefined;
      }
      // Get remaining segments after wildcard
      const segmentIndex = segments.indexOf(segment);
      const remainingSegments = segments.slice(segmentIndex + 1);
      if (remainingSegments.length === 0) {
        return current; // [*] at end = return entire array
      }
      // Build remaining path string for recursive call
      const remainingPath = buildPathFromSegments(remainingSegments);
      return current.map(item => getValueByPath(item, remainingPath));
    }
  }

  return current;
}

/**
 * Path segment types
 */
interface PropertySegment {
  type: 'property';
  key: string;
}

interface IndexSegment {
  type: 'index';
  index: number;
}

interface WildcardSegment {
  type: 'wildcard';
}

type PathSegment = PropertySegment | IndexSegment | WildcardSegment;

/**
 * Parse a path string into segments
 * "contact.tags[0].name" -> [{property: "contact"}, {property: "tags"}, {index: 0}, {property: "name"}]
 */
function parsePath(path: string): PathSegment[] {
  const segments: PathSegment[] = [];
  let current = '';
  let i = 0;

  while (i < path.length) {
    const char = path[i];

    if (char === '.') {
      if (current) {
        segments.push({ type: 'property', key: current });
        current = '';
      }
      i++;
    } else if (char === '[') {
      if (current) {
        segments.push({ type: 'property', key: current });
        current = '';
      }
      // Find closing bracket
      const closeIndex = path.indexOf(']', i);
      if (closeIndex === -1) {
        // Malformed path, treat rest as property
        current = path.slice(i);
        break;
      }
      const indexStr = path.slice(i + 1, closeIndex);
      if (indexStr === '*') {
        segments.push({ type: 'wildcard' });
      } else {
        const index = parseInt(indexStr, 10);
        if (!isNaN(index)) {
          segments.push({ type: 'index', index });
        }
      }
      i = closeIndex + 1;
    } else {
      current += char;
      i++;
    }
  }

  if (current) {
    segments.push({ type: 'property', key: current });
  }

  return segments;
}

/**
 * Build a path string from segments
 * Used for recursive calls with remaining segments after wildcard
 */
function buildPathFromSegments(segments: PathSegment[]): string {
  return segments.map((seg, i) => {
    if (seg.type === 'property') {
      return i === 0 ? seg.key : `.${seg.key}`;
    } else if (seg.type === 'index') {
      return `[${seg.index}]`;
    } else {
      return '[*]';
    }
  }).join('');
}

/**
 * Project selected fields from a single object
 *
 * @param obj - Source object
 * @param fields - Array of field paths to select
 * @returns New object with only selected fields
 */
export function projectFields(
  obj: unknown,
  fields: string[]
): Record<string, unknown> {
  if (obj === null || obj === undefined || typeof obj !== 'object') {
    return {};
  }

  const result: Record<string, unknown> = {};

  for (const field of fields) {
    const value = getValueByPath(obj, field);
    if (value !== undefined) {
      // Use the last segment as the key (flatten nested paths)
      // But preserve full path for clarity
      setValueByPath(result, field, value);
    }
  }

  return result;
}

/**
 * Set a value in an object using a path string
 * Creates nested structure as needed
 */
function setValueByPath(
  obj: Record<string, unknown>,
  path: string,
  value: unknown
): void {
  const segments = parsePath(path);
  let current: Record<string, unknown> = obj;

  for (let i = 0; i < segments.length - 1; i++) {
    const segment = segments[i];
    const nextSegment = segments[i + 1];

    if (segment.type === 'property') {
      if (current[segment.key] === undefined) {
        // Create array or object based on next segment
        current[segment.key] = nextSegment.type === 'index' ? [] : {};
      }
      current = current[segment.key] as Record<string, unknown>;
    } else if (segment.type === 'index') {
      const arr = current as unknown as unknown[];
      if (arr[segment.index] === undefined) {
        arr[segment.index] = nextSegment.type === 'index' ? [] : {};
      }
      current = arr[segment.index] as Record<string, unknown>;
    }
  }

  // Set the final value
  const lastSegment = segments[segments.length - 1];
  if (lastSegment.type === 'property') {
    current[lastSegment.key] = value;
  } else if (lastSegment.type === 'index') {
    (current as unknown as unknown[])[lastSegment.index] = value;
  }
}

/**
 * Strip leading [*]. from field paths for array projection
 * "[*].firstName" -> "firstName"
 * "[*].user.name" -> "user.name"
 * "firstName" -> "firstName" (unchanged)
 */
function stripArrayWildcardPrefix(field: string): string {
  if (field.startsWith('[*].')) {
    return field.slice(4);
  }
  if (field === '[*]') {
    return ''; // Return entire item
  }
  return field;
}

/**
 * Project fields from an array of objects
 * Handles [*].field syntax by stripping the prefix and applying to each element
 *
 * @param arr - Source array
 * @param fields - Array of field paths to select
 * @returns New array with projected objects
 */
export function projectArray(
  arr: unknown[],
  fields: string[]
): unknown[] {
  // Check if all fields start with [*] - this means we want to extract from each element
  const hasWildcardFields = fields.some(f => f.startsWith('[*]'));

  if (hasWildcardFields) {
    // Strip [*]. prefix and apply to each element
    const strippedFields = fields.map(stripArrayWildcardPrefix).filter(f => f !== '');

    if (strippedFields.length === 0) {
      // Only had [*] - return the array as-is
      return arr;
    }

    return arr.map(item => {
      if (item === null || item === undefined || typeof item !== 'object') {
        return {};
      }
      return projectFields(item, strippedFields);
    });
  }

  // No wildcard prefix - apply fields directly to each element
  return arr.map(item => projectFields(item, fields));
}

/**
 * Apply field projection to a result
 * Handles both single objects and arrays
 *
 * @param result - Tool execution result
 * @param fields - Fields to select (if empty, return as-is)
 * @returns Projected result
 */
export function applyProjection(
  result: unknown,
  fields: string[] | undefined
): unknown {
  if (!fields || fields.length === 0) {
    return result;
  }

  if (Array.isArray(result)) {
    return projectArray(result, fields);
  }

  if (typeof result === 'object' && result !== null) {
    return projectFields(result, fields);
  }

  // Primitives pass through unchanged
  return result;
}

/**
 * Result of projection with optional warnings
 */
export interface ProjectionWithWarnings {
  value: unknown;
  warnings?: string[];
}

/**
 * Apply projection with warnings for missing fields
 * Returns both the projected value and any warnings about fields not found
 *
 * @param result - Tool execution result
 * @param fields - Fields to select (if empty, return as-is)
 * @returns Projected result with optional warnings
 */
export function applyProjectionWithWarnings(
  result: unknown,
  fields: string[] | undefined
): ProjectionWithWarnings {
  if (!fields || fields.length === 0) {
    return { value: result };
  }

  const warnings: string[] = [];

  if (Array.isArray(result)) {
    return { value: projectArray(result, fields) };
  }

  if (typeof result === 'object' && result !== null) {
    const projected: Record<string, unknown> = {};
    for (const field of fields) {
      const value = getValueByPath(result, field);
      if (value === undefined) {
        warnings.push(`Field "${field}" not found in result`);
      } else {
        setValueByPath(projected, field, value);
      }
    }
    return {
      value: projected,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }

  return { value: result };
}
