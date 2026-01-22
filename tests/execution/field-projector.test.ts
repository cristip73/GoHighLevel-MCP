/**
 * Unit Tests for Field Projector
 * Tests field selection with dot notation and array indexing
 */

import { describe, it, expect } from '@jest/globals';
import {
  getValueByPath,
  projectFields,
  projectArray,
  applyProjection
} from '../../src/execution/field-projector.js';

describe('Field Projector', () => {
  describe('getValueByPath', () => {
    const testObj = {
      id: '123',
      name: 'John Doe',
      contact: {
        email: 'john@example.com',
        phone: '+1234567890',
        address: {
          city: 'New York',
          zip: '10001'
        }
      },
      tags: ['vip', 'customer', 'active'],
      items: [
        { id: 1, name: 'Item 1' },
        { id: 2, name: 'Item 2' }
      ]
    };

    it('should get simple property', () => {
      expect(getValueByPath(testObj, 'id')).toBe('123');
      expect(getValueByPath(testObj, 'name')).toBe('John Doe');
    });

    it('should get nested property with dot notation', () => {
      expect(getValueByPath(testObj, 'contact.email')).toBe('john@example.com');
      expect(getValueByPath(testObj, 'contact.address.city')).toBe('New York');
    });

    it('should get array element by index', () => {
      expect(getValueByPath(testObj, 'tags[0]')).toBe('vip');
      expect(getValueByPath(testObj, 'tags[2]')).toBe('active');
    });

    it('should get nested property from array element', () => {
      expect(getValueByPath(testObj, 'items[0].name')).toBe('Item 1');
      expect(getValueByPath(testObj, 'items[1].id')).toBe(2);
    });

    it('should return undefined for non-existent paths', () => {
      expect(getValueByPath(testObj, 'nonexistent')).toBeUndefined();
      expect(getValueByPath(testObj, 'contact.nonexistent')).toBeUndefined();
      expect(getValueByPath(testObj, 'tags[99]')).toBeUndefined();
    });

    it('should handle null/undefined input', () => {
      expect(getValueByPath(null, 'id')).toBeUndefined();
      expect(getValueByPath(undefined, 'id')).toBeUndefined();
    });

    it('should return undefined when accessing property on primitive', () => {
      // Line 33-34: typeof current !== 'object'
      expect(getValueByPath('string', 'length')).toBeUndefined();
      expect(getValueByPath(123, 'toString')).toBeUndefined();
    });

    it('should return undefined when accessing array index on non-array', () => {
      // Line 38-39: !Array.isArray(current)
      const obj = { items: 'not an array' };
      expect(getValueByPath(obj, 'items[0]')).toBeUndefined();
    });

    it('should return undefined for null in path chain', () => {
      // Line 28-29: current === null
      const obj = { user: null };
      expect(getValueByPath(obj, 'user.name')).toBeUndefined();
    });

    it('should handle malformed path with unclosed bracket', () => {
      // Lines 89-91: malformed path
      const obj = { items: [1, 2, 3] };
      expect(getValueByPath(obj, 'items[0')).toBeUndefined();
    });
  });

  describe('projectFields', () => {
    const testObj = {
      id: '123',
      name: 'John',
      email: 'john@test.com',
      phone: '+123',
      nested: { a: 1, b: 2 },
      tags: ['a', 'b', 'c']
    };

    it('should project single field', () => {
      const result = projectFields(testObj, ['id']);
      expect(result).toEqual({ id: '123' });
    });

    it('should project multiple fields', () => {
      const result = projectFields(testObj, ['id', 'name', 'email']);
      expect(result).toEqual({
        id: '123',
        name: 'John',
        email: 'john@test.com'
      });
    });

    it('should project nested fields', () => {
      const result = projectFields(testObj, ['nested.a']);
      expect(result).toEqual({ nested: { a: 1 } });
    });

    it('should project array elements', () => {
      const result = projectFields(testObj, ['tags[0]']);
      expect(result).toEqual({ tags: ['a'] });
    });

    it('should project deeply nested array elements', () => {
      // Lines 163-168: setValueByPath with array indexing as intermediate segment
      const obj = {
        data: {
          users: [
            { name: 'John', scores: [100, 90] },
            { name: 'Jane', scores: [95, 85] }
          ]
        }
      };
      const result = projectFields(obj, ['data.users[0].scores[1]']);
      expect(result).toEqual({
        data: {
          users: [
            { scores: [undefined, 90] }
          ]
        }
      });
    });

    it('should project multiple nested array paths', () => {
      const obj = {
        items: [
          { values: [{ x: 1 }, { x: 2 }] },
          { values: [{ x: 3 }, { x: 4 }] }
        ]
      };
      const result = projectFields(obj, ['items[1].values[0].x']);
      expect(result).toEqual({
        items: [undefined, { values: [{ x: 3 }] }]
      });
    });

    it('should ignore non-existent fields', () => {
      const result = projectFields(testObj, ['id', 'nonexistent']);
      expect(result).toEqual({ id: '123' });
    });

    it('should return empty object for invalid input', () => {
      expect(projectFields(null, ['id'])).toEqual({});
      expect(projectFields('string', ['id'])).toEqual({});
    });
  });

  describe('projectArray', () => {
    const testArray = [
      { id: '1', name: 'John', email: 'john@test.com' },
      { id: '2', name: 'Jane', email: 'jane@test.com' },
      { id: '3', name: 'Bob', email: 'bob@test.com' }
    ];

    it('should project fields from all array elements', () => {
      const result = projectArray(testArray, ['id', 'name']);
      expect(result).toEqual([
        { id: '1', name: 'John' },
        { id: '2', name: 'Jane' },
        { id: '3', name: 'Bob' }
      ]);
    });

    it('should handle empty array', () => {
      expect(projectArray([], ['id'])).toEqual([]);
    });
  });

  describe('applyProjection', () => {
    it('should apply projection to object', () => {
      const obj = { id: '1', name: 'John', extra: 'data' };
      const result = applyProjection(obj, ['id', 'name']);
      expect(result).toEqual({ id: '1', name: 'John' });
    });

    it('should apply projection to array', () => {
      const arr = [
        { id: '1', name: 'John' },
        { id: '2', name: 'Jane' }
      ];
      const result = applyProjection(arr, ['id']);
      expect(result).toEqual([{ id: '1' }, { id: '2' }]);
    });

    it('should return original data when fields is empty or undefined', () => {
      const data = { id: '1', name: 'John' };
      expect(applyProjection(data, [])).toEqual(data);
      expect(applyProjection(data, undefined)).toEqual(data);
    });

    it('should pass through primitives unchanged', () => {
      expect(applyProjection('string', ['id'])).toBe('string');
      expect(applyProjection(123, ['id'])).toBe(123);
      expect(applyProjection(null, ['id'])).toBe(null);
    });
  });

  describe('Array wildcard [*]', () => {
    it('should extract field from all array elements', () => {
      const obj = {
        contacts: [
          { firstName: 'John', email: 'john@test.com' },
          { firstName: 'Jane', email: 'jane@test.com' }
        ]
      };
      expect(getValueByPath(obj, 'contacts[*].firstName'))
        .toEqual(['John', 'Jane']);
    });

    it('should handle nested paths after [*]', () => {
      const obj = {
        items: [
          { user: { name: 'A' } },
          { user: { name: 'B' } }
        ]
      };
      expect(getValueByPath(obj, 'items[*].user.name'))
        .toEqual(['A', 'B']);
    });

    it('should return undefined for non-array', () => {
      const obj = { data: 'string' };
      expect(getValueByPath(obj, 'data[*].field')).toBeUndefined();
    });

    it('should return entire array when [*] is last segment', () => {
      const obj = { tags: ['a', 'b', 'c'] };
      expect(getValueByPath(obj, 'tags[*]')).toEqual(['a', 'b', 'c']);
    });

    it('should handle multiple fields with [*]', () => {
      const obj = {
        users: [
          { id: 1, name: 'Alice', role: 'admin' },
          { id: 2, name: 'Bob', role: 'user' },
          { id: 3, name: 'Charlie', role: 'user' }
        ]
      };
      expect(getValueByPath(obj, 'users[*].id')).toEqual([1, 2, 3]);
      expect(getValueByPath(obj, 'users[*].name')).toEqual(['Alice', 'Bob', 'Charlie']);
      expect(getValueByPath(obj, 'users[*].role')).toEqual(['admin', 'user', 'user']);
    });

    it('should handle undefined values in array', () => {
      const obj = {
        items: [
          { value: 10 },
          { other: 20 }, // no 'value' field
          { value: 30 }
        ]
      };
      expect(getValueByPath(obj, 'items[*].value'))
        .toEqual([10, undefined, 30]);
    });

    it('should handle deep nesting after [*]', () => {
      const obj = {
        orders: [
          { customer: { address: { city: 'NYC' } } },
          { customer: { address: { city: 'LA' } } }
        ]
      };
      expect(getValueByPath(obj, 'orders[*].customer.address.city'))
        .toEqual(['NYC', 'LA']);
    });

    it('should handle empty array with [*]', () => {
      const obj = { items: [] };
      expect(getValueByPath(obj, 'items[*].name')).toEqual([]);
    });

    it('should work with projectFields for wildcard paths', () => {
      const obj = {
        contacts: [
          { firstName: 'Mihaela', email: 'miha@test.com' },
          { firstName: 'Adelina', email: 'adelina@test.com' }
        ],
        total: 107229
      };
      const result = projectFields(obj, ['contacts[*].firstName', 'contacts[*].email', 'total']);
      expect(result).toEqual({
        contacts: {
          firstName: ['Mihaela', 'Adelina'],
          email: ['miha@test.com', 'adelina@test.com']
        },
        total: 107229
      });
    });
  });

  describe('projectArray with [*] prefix', () => {
    it('should strip [*]. prefix and project fields from each element', () => {
      const arr = [
        { firstName: 'John', lastName: 'Doe', email: 'john@test.com' },
        { firstName: 'Jane', lastName: 'Smith', email: 'jane@test.com' }
      ];
      const result = projectArray(arr, ['[*].firstName', '[*].email']);
      expect(result).toEqual([
        { firstName: 'John', email: 'john@test.com' },
        { firstName: 'Jane', email: 'jane@test.com' }
      ]);
    });

    it('should handle nested paths after [*].', () => {
      const arr = [
        { user: { name: 'Alice', role: 'admin' } },
        { user: { name: 'Bob', role: 'user' } }
      ];
      const result = projectArray(arr, ['[*].user.name']);
      expect(result).toEqual([
        { user: { name: 'Alice' } },
        { user: { name: 'Bob' } }
      ]);
    });

    it('should return array as-is when only [*] is specified', () => {
      const arr = [1, 2, 3];
      const result = projectArray(arr, ['[*]']);
      expect(result).toEqual([1, 2, 3]);
    });

    it('should work without [*] prefix (direct field projection)', () => {
      const arr = [
        { id: 1, name: 'A' },
        { id: 2, name: 'B' }
      ];
      const result = projectArray(arr, ['id']);
      expect(result).toEqual([
        { id: 1 },
        { id: 2 }
      ]);
    });

    it('should handle mixed fields with and without [*] prefix', () => {
      const arr = [
        { firstName: 'John', lastName: 'Doe' },
        { firstName: 'Jane', lastName: 'Smith' }
      ];
      // When any field has [*], all are processed with strip
      const result = projectArray(arr, ['[*].firstName', 'lastName']);
      expect(result).toEqual([
        { firstName: 'John', lastName: 'Doe' },
        { firstName: 'Jane', lastName: 'Smith' }
      ]);
    });

    it('should handle null/undefined items in array', () => {
      const arr = [
        { name: 'Valid' },
        null,
        { name: 'Also Valid' }
      ];
      const result = projectArray(arr, ['[*].name']);
      expect(result).toEqual([
        { name: 'Valid' },
        {},
        { name: 'Also Valid' }
      ]);
    });
  });
});
