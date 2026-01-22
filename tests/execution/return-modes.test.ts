/**
 * Unit Tests for Return Modes
 * Tests summary and file return modes
 */

import { describe, it, expect, afterAll } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  applySummaryMode,
  applyFileMode,
  applyReturnMode
} from '../../src/execution/return-modes.js';

describe('Return Modes', () => {
  // Cleanup temp files after tests
  const createdFiles: string[] = [];

  afterAll(() => {
    for (const filePath of createdFiles) {
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch {
        // Ignore cleanup errors
      }
    }
  });

  describe('applySummaryMode', () => {
    it('should summarize array with count and sample', () => {
      const data = [
        { id: '1', name: 'Item 1' },
        { id: '2', name: 'Item 2' },
        { id: '3', name: 'Item 3' },
        { id: '4', name: 'Item 4' },
        { id: '5', name: 'Item 5' }
      ];
      const result = applySummaryMode(data);

      expect(result.count).toBe(5);
      expect(result.sample).toHaveLength(3);
      expect(result.sample[0]).toEqual({ id: '1', name: 'Item 1' });
      expect(result.truncated).toBe(true);
    });

    it('should not truncate small arrays', () => {
      const data = [
        { id: '1', name: 'Item 1' },
        { id: '2', name: 'Item 2' }
      ];
      const result = applySummaryMode(data);

      expect(result.count).toBe(2);
      expect(result.sample).toHaveLength(2);
      expect(result.truncated).toBe(false);
    });

    it('should handle empty array', () => {
      const result = applySummaryMode([]);
      expect(result.count).toBe(0);
      expect(result.sample).toEqual([]);
      expect(result.truncated).toBe(false);
    });

    it('should handle null/undefined as empty result', () => {
      const nullResult = applySummaryMode(null);
      expect(nullResult.count).toBe(0);
      expect(nullResult.sample).toEqual([]);

      const undefinedResult = applySummaryMode(undefined);
      expect(undefinedResult.count).toBe(0);
      expect(undefinedResult.sample).toEqual([]);
    });

    it('should wrap single object in sample', () => {
      const obj = { id: '1', name: 'Single Item' };
      const result = applySummaryMode(obj);

      expect(result.count).toBe(1);
      expect(result.sample).toEqual([obj]);
      expect(result.truncated).toBe(false);
    });

    it('should handle primitive values', () => {
      expect(applySummaryMode('string').count).toBe(1);
      expect(applySummaryMode(123).count).toBe(1);
      expect(applySummaryMode(true).count).toBe(1);
    });
  });

  describe('applyFileMode', () => {
    it('should write data to temp file', () => {
      const data = [{ id: '1' }, { id: '2' }];
      const result = applyFileMode(data, 'test_tool');

      createdFiles.push(result.path);

      expect(result.path).toContain('ghl-mcp-results');
      expect(result.path).toContain('test_tool');
      expect(result.path.endsWith('.json')).toBe(true);
      expect(result.count).toBe(2);
      expect(result.size).toBeGreaterThan(0);
      expect(result.format).toBe('json');

      // Verify file exists and is valid JSON
      expect(fs.existsSync(result.path)).toBe(true);
      const content = fs.readFileSync(result.path, 'utf-8');
      expect(JSON.parse(content)).toEqual(data);
    });

    it('should create unique filenames', () => {
      const result1 = applyFileMode({ a: 1 }, 'test');
      const result2 = applyFileMode({ b: 2 }, 'test');

      createdFiles.push(result1.path, result2.path);

      expect(result1.path).not.toBe(result2.path);
    });

    it('should handle single object', () => {
      const obj = { id: '1', name: 'Test' };
      const result = applyFileMode(obj, 'single');

      createdFiles.push(result.path);

      expect(result.count).toBe(1);
    });
  });

  describe('applyReturnMode', () => {
    it('should return inline data unchanged (default)', () => {
      const data = { id: '1' };
      expect(applyReturnMode(data, undefined, 'test')).toBe(data);
      expect(applyReturnMode(data, 'inline', 'test')).toBe(data);
    });

    it('should apply summary mode', () => {
      const data = [{ id: '1' }, { id: '2' }, { id: '3' }, { id: '4' }];
      const result = applyReturnMode(data, 'summary', 'test') as any;

      expect(result.count).toBe(4);
      expect(result.sample).toHaveLength(3);
      expect(result.truncated).toBe(true);
    });

    it('should apply file mode', () => {
      const data = [{ id: '1' }];
      const result = applyReturnMode(data, 'file', 'test') as any;

      createdFiles.push(result.path);

      expect(result.path).toBeDefined();
      expect(result.count).toBe(1);
      expect(result.size).toBeGreaterThan(0);
    });
  });
});
