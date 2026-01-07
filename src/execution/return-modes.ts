/**
 * Return Modes - Transform results based on return_mode option
 *
 * Modes:
 * - 'inline': Return data directly (default)
 * - 'summary': Return {count, sample: [...3 items]}
 * - 'file': Write to temp file, return {path, count, size}
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ReturnMode } from '../registry/types.js';

/**
 * Summary mode result
 */
export interface SummaryResult {
  count: number;
  sample: unknown[];
  truncated: boolean;
}

/**
 * File mode result
 */
export interface FileResult {
  path: string;
  count: number;
  size: number;
  format: 'json';
}

/**
 * Apply summary return mode
 * Returns count and up to 3 sample items
 *
 * @param result - Tool execution result
 * @returns Summary with count and sample
 */
export function applySummaryMode(result: unknown): SummaryResult {
  if (Array.isArray(result)) {
    return {
      count: result.length,
      sample: result.slice(0, 3),
      truncated: result.length > 3
    };
  }

  // Single object or primitive
  return {
    count: 1,
    sample: [result],
    truncated: false
  };
}

/**
 * Apply file return mode
 * Writes result to a temp JSON file
 *
 * @param result - Tool execution result
 * @param toolName - Name of the tool (for filename)
 * @returns File info with path, count, size
 */
export function applyFileMode(result: unknown, toolName: string): FileResult {
  // Create temp directory for GHL MCP results if it doesn't exist
  const tempDir = path.join(os.tmpdir(), 'ghl-mcp-results');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  // Generate unique filename
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  const filename = `${toolName}_${timestamp}_${randomSuffix}.json`;
  const filePath = path.join(tempDir, filename);

  // Write JSON data
  const jsonData = JSON.stringify(result, null, 2);
  fs.writeFileSync(filePath, jsonData, 'utf-8');

  // Get file stats
  const stats = fs.statSync(filePath);

  // Calculate count
  const count = Array.isArray(result) ? result.length : 1;

  return {
    path: filePath,
    count,
    size: stats.size,
    format: 'json'
  };
}

/**
 * Apply return mode transformation to a result
 *
 * @param result - Tool execution result
 * @param mode - Return mode ('inline', 'summary', 'file')
 * @param toolName - Name of the tool (for file mode)
 * @returns Transformed result based on mode
 */
export function applyReturnMode(
  result: unknown,
  mode: ReturnMode | undefined,
  toolName: string
): unknown {
  // Default to inline (no transformation)
  if (!mode || mode === 'inline') {
    return result;
  }

  switch (mode) {
    case 'summary':
      return applySummaryMode(result);

    case 'file':
      return applyFileMode(result, toolName);

    default:
      return result;
  }
}
