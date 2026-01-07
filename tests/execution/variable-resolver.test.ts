/**
 * Unit Tests for Variable Resolver
 * Tests {{step_id.field}} template variable resolution
 */

import { describe, it, expect } from '@jest/globals';
import {
  parseVariable,
  findVariables,
  resolveVariable,
  resolveString,
  resolveVariables,
  hasUnresolvedVariables,
  getReferencedSteps,
  PipelineContext
} from '../../src/execution/variable-resolver.js';

describe('Variable Resolver', () => {
  describe('parseVariable', () => {
    it('should parse simple variable', () => {
      const result = parseVariable('{{step1}}');
      expect(result).toEqual({
        fullMatch: '{{step1}}',
        stepId: 'step1',
        path: ''
      });
    });

    it('should parse variable with field path', () => {
      const result = parseVariable('{{step1.id}}');
      expect(result).toEqual({
        fullMatch: '{{step1.id}}',
        stepId: 'step1',
        path: 'id'
      });
    });

    it('should parse variable with nested path', () => {
      const result = parseVariable('{{search.contact.email}}');
      expect(result).toEqual({
        fullMatch: '{{search.contact.email}}',
        stepId: 'search',
        path: 'contact.email'
      });
    });

    it('should parse variable with array index', () => {
      const result = parseVariable('{{contacts[0]}}');
      expect(result).toEqual({
        fullMatch: '{{contacts[0]}}',
        stepId: 'contacts',
        path: '[0]'
      });
    });

    it('should parse variable with array index and path', () => {
      const result = parseVariable('{{search[0].id}}');
      expect(result).toEqual({
        fullMatch: '{{search[0].id}}',
        stepId: 'search',
        path: '[0].id'
      });
    });

    it('should parse variable with underscore in step id', () => {
      const result = parseVariable('{{search_contacts.id}}');
      expect(result).toEqual({
        fullMatch: '{{search_contacts.id}}',
        stepId: 'search_contacts',
        path: 'id'
      });
    });

    it('should return null for invalid variables', () => {
      expect(parseVariable('not a variable')).toBeNull();
      expect(parseVariable('{{}}') ).toBeNull();
      expect(parseVariable('{step1}')).toBeNull();
      expect(parseVariable('{{123invalid}}')).toBeNull();
    });
  });

  describe('findVariables', () => {
    it('should find single variable in string', () => {
      const result = findVariables('Hello {{name.first}}!');
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        fullMatch: '{{name.first}}',
        stepId: 'name',
        path: 'first'
      });
    });

    it('should find multiple variables', () => {
      const result = findVariables('{{first.id}} and {{second.name}}');
      expect(result).toHaveLength(2);
      expect(result[0].stepId).toBe('first');
      expect(result[1].stepId).toBe('second');
    });

    it('should return empty array for string without variables', () => {
      expect(findVariables('No variables here')).toEqual([]);
    });

    it('should return empty array for non-string input', () => {
      expect(findVariables(123 as any)).toEqual([]);
      expect(findVariables(null as any)).toEqual([]);
    });
  });

  describe('resolveVariable', () => {
    const context: PipelineContext = {
      step1: { id: '123', name: 'Test', nested: { value: 42 } },
      contacts: [
        { id: 'c1', email: 'a@test.com' },
        { id: 'c2', email: 'b@test.com' }
      ]
    };

    it('should resolve simple field', () => {
      const variable = parseVariable('{{step1.id}}')!;
      expect(resolveVariable(variable, context)).toBe('123');
    });

    it('should resolve nested field', () => {
      const variable = parseVariable('{{step1.nested.value}}')!;
      expect(resolveVariable(variable, context)).toBe(42);
    });

    it('should resolve full step result when no path', () => {
      const variable = parseVariable('{{step1}}')!;
      expect(resolveVariable(variable, context)).toEqual({
        id: '123',
        name: 'Test',
        nested: { value: 42 }
      });
    });

    it('should resolve array index', () => {
      const variable = parseVariable('{{contacts[0]}}')!;
      expect(resolveVariable(variable, context)).toEqual({
        id: 'c1',
        email: 'a@test.com'
      });
    });

    it('should resolve array index with field', () => {
      const variable = parseVariable('{{contacts[1].email}}')!;
      expect(resolveVariable(variable, context)).toBe('b@test.com');
    });

    it('should return undefined for missing step', () => {
      const variable = parseVariable('{{missing.id}}')!;
      expect(resolveVariable(variable, context)).toBeUndefined();
    });

    it('should return undefined for missing field', () => {
      const variable = parseVariable('{{step1.nonexistent}}')!;
      expect(resolveVariable(variable, context)).toBeUndefined();
    });
  });

  describe('resolveString', () => {
    const context: PipelineContext = {
      user: { id: '123', name: 'John' },
      count: 42
    };

    it('should return original string when no variables', () => {
      expect(resolveString('Hello world', context)).toBe('Hello world');
    });

    it('should resolve single variable and preserve type', () => {
      expect(resolveString('{{user.id}}', context)).toBe('123');
      expect(resolveString('{{user}}', context)).toEqual({ id: '123', name: 'John' });
    });

    it('should interpolate multiple variables as string', () => {
      expect(resolveString('User {{user.id}} is {{user.name}}', context))
        .toBe('User 123 is John');
    });

    it('should replace undefined variables with empty string', () => {
      expect(resolveString('Value: {{missing.field}}', context))
        .toBe('Value: ');
    });
  });

  describe('resolveVariables', () => {
    const context: PipelineContext = {
      search: { contacts: [{ id: 'c1' }, { id: 'c2' }] },
      selected: { id: 'c1', email: 'test@example.com' }
    };

    it('should resolve variables in object', () => {
      const input = {
        contactId: '{{selected.id}}',
        message: 'Hello'
      };
      expect(resolveVariables(input, context)).toEqual({
        contactId: 'c1',
        message: 'Hello'
      });
    });

    it('should resolve variables in nested object', () => {
      const input = {
        data: {
          id: '{{selected.id}}',
          email: '{{selected.email}}'
        }
      };
      expect(resolveVariables(input, context)).toEqual({
        data: {
          id: 'c1',
          email: 'test@example.com'
        }
      });
    });

    it('should resolve variables in array', () => {
      const input = ['{{selected.id}}', '{{selected.email}}'];
      expect(resolveVariables(input, context)).toEqual(['c1', 'test@example.com']);
    });

    it('should pass through primitives unchanged', () => {
      expect(resolveVariables(42, context)).toBe(42);
      expect(resolveVariables(true, context)).toBe(true);
      expect(resolveVariables(null, context)).toBe(null);
    });

    it('should handle complex nested structures', () => {
      const input = {
        ids: ['{{search.contacts[0].id}}', '{{search.contacts[1].id}}'],
        primary: '{{selected.id}}'
      };
      expect(resolveVariables(input, context)).toEqual({
        ids: ['c1', 'c2'],
        primary: 'c1'
      });
    });
  });

  describe('hasUnresolvedVariables', () => {
    it('should return true when variables present', () => {
      expect(hasUnresolvedVariables('{{step.id}}')).toBe(true);
      expect(hasUnresolvedVariables({ id: '{{step.id}}' })).toBe(true);
      expect(hasUnresolvedVariables(['{{a}}', '{{b}}'])).toBe(true);
    });

    it('should return false when no variables', () => {
      expect(hasUnresolvedVariables('no variables')).toBe(false);
      expect(hasUnresolvedVariables({ id: '123' })).toBe(false);
      expect(hasUnresolvedVariables(42)).toBe(false);
    });
  });

  describe('getReferencedSteps', () => {
    it('should extract unique step IDs from value', () => {
      const input = {
        a: '{{step1.id}}',
        b: '{{step2.name}}',
        c: '{{step1.other}}'
      };
      const steps = getReferencedSteps(input);
      expect(steps.sort()).toEqual(['step1', 'step2']);
    });

    it('should handle nested structures', () => {
      const input = {
        outer: {
          inner: ['{{a.x}}', '{{b.y}}']
        }
      };
      const steps = getReferencedSteps(input);
      expect(steps.sort()).toEqual(['a', 'b']);
    });

    it('should return empty array when no references', () => {
      expect(getReferencedSteps('no refs')).toEqual([]);
      expect(getReferencedSteps({ id: '123' })).toEqual([]);
    });
  });
});
