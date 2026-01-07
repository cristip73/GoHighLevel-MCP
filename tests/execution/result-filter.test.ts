/**
 * Unit Tests for Result Filter
 * Tests filter expression parsing and all operators
 */

import { describe, it, expect } from '@jest/globals';
import {
  parseFilter,
  matchesFilter,
  filterArray,
  applyFilter,
  type ParsedFilter
} from '../../src/execution/result-filter.js';

describe('Result Filter', () => {
  describe('parseFilter', () => {
    it('should parse equality operator', () => {
      const result = parseFilter('status = active');
      expect(result).toEqual({
        field: 'status',
        operator: '=',
        value: 'active'
      });
    });

    it('should parse inequality operator', () => {
      const result = parseFilter('status != inactive');
      expect(result).toEqual({
        field: 'status',
        operator: '!=',
        value: 'inactive'
      });
    });

    it('should parse greater than operator', () => {
      const result = parseFilter('age > 18');
      expect(result).toEqual({
        field: 'age',
        operator: '>',
        value: '18'
      });
    });

    it('should parse less than operator', () => {
      const result = parseFilter('price < 100');
      expect(result).toEqual({
        field: 'price',
        operator: '<',
        value: '100'
      });
    });

    it('should parse CONTAINS operator', () => {
      const result = parseFilter('email CONTAINS @gmail.com');
      expect(result).toEqual({
        field: 'email',
        operator: 'CONTAINS',
        value: '@gmail.com'
      });
    });

    it('should parse STARTS_WITH operator', () => {
      const result = parseFilter('name STARTS_WITH John');
      expect(result).toEqual({
        field: 'name',
        operator: 'STARTS_WITH',
        value: 'John'
      });
    });

    it('should parse IS_NULL operator', () => {
      const result = parseFilter('phone IS_NULL');
      expect(result).toEqual({
        field: 'phone',
        operator: 'IS_NULL',
        value: null
      });
    });

    it('should parse IS_NOT_NULL operator', () => {
      const result = parseFilter('email IS_NOT_NULL');
      expect(result).toEqual({
        field: 'email',
        operator: 'IS_NOT_NULL',
        value: null
      });
    });

    it('should handle nested field paths', () => {
      const result = parseFilter('contact.email CONTAINS @test.com');
      expect(result).toEqual({
        field: 'contact.email',
        operator: 'CONTAINS',
        value: '@test.com'
      });
    });

    it('should return null for invalid expressions', () => {
      expect(parseFilter('')).toBeNull();
      expect(parseFilter(null as any)).toBeNull();
      expect(parseFilter('invalid')).toBeNull();
    });
  });

  describe('matchesFilter', () => {
    describe('= operator', () => {
      it('should match equal strings (case-insensitive)', () => {
        const filter: ParsedFilter = { field: 'status', operator: '=', value: 'active' };
        expect(matchesFilter({ status: 'active' }, filter)).toBe(true);
        expect(matchesFilter({ status: 'ACTIVE' }, filter)).toBe(true);
        expect(matchesFilter({ status: 'inactive' }, filter)).toBe(false);
      });

      it('should match equal numbers', () => {
        const filter: ParsedFilter = { field: 'count', operator: '=', value: '5' };
        expect(matchesFilter({ count: 5 }, filter)).toBe(true);
        expect(matchesFilter({ count: 10 }, filter)).toBe(false);
      });

      it('should match booleans', () => {
        const filter: ParsedFilter = { field: 'active', operator: '=', value: 'true' };
        expect(matchesFilter({ active: true }, filter)).toBe(true);
        expect(matchesFilter({ active: false }, filter)).toBe(false);
      });

      it('should match value in array', () => {
        const filter: ParsedFilter = { field: 'tags', operator: '=', value: 'vip' };
        expect(matchesFilter({ tags: ['vip', 'customer'] }, filter)).toBe(true);
        expect(matchesFilter({ tags: ['regular'] }, filter)).toBe(false);
      });
    });

    describe('!= operator', () => {
      it('should not match equal values', () => {
        const filter: ParsedFilter = { field: 'status', operator: '!=', value: 'active' };
        expect(matchesFilter({ status: 'inactive' }, filter)).toBe(true);
        expect(matchesFilter({ status: 'active' }, filter)).toBe(false);
      });
    });

    describe('> operator', () => {
      it('should compare numbers', () => {
        const filter: ParsedFilter = { field: 'age', operator: '>', value: '18' };
        expect(matchesFilter({ age: 25 }, filter)).toBe(true);
        expect(matchesFilter({ age: 18 }, filter)).toBe(false);
        expect(matchesFilter({ age: 10 }, filter)).toBe(false);
      });
    });

    describe('< operator', () => {
      it('should compare numbers', () => {
        const filter: ParsedFilter = { field: 'price', operator: '<', value: '100' };
        expect(matchesFilter({ price: 50 }, filter)).toBe(true);
        expect(matchesFilter({ price: 100 }, filter)).toBe(false);
        expect(matchesFilter({ price: 150 }, filter)).toBe(false);
      });
    });

    describe('CONTAINS operator', () => {
      it('should find substring in string', () => {
        const filter: ParsedFilter = { field: 'email', operator: 'CONTAINS', value: '@gmail' };
        expect(matchesFilter({ email: 'john@gmail.com' }, filter)).toBe(true);
        expect(matchesFilter({ email: 'john@yahoo.com' }, filter)).toBe(false);
      });

      it('should be case-insensitive', () => {
        const filter: ParsedFilter = { field: 'name', operator: 'CONTAINS', value: 'john' };
        expect(matchesFilter({ name: 'JOHN DOE' }, filter)).toBe(true);
      });

      it('should search in array values', () => {
        const filter: ParsedFilter = { field: 'tags', operator: 'CONTAINS', value: 'vip' };
        expect(matchesFilter({ tags: ['customer', 'vip-gold'] }, filter)).toBe(true);
      });
    });

    describe('STARTS_WITH operator', () => {
      it('should match string prefix', () => {
        const filter: ParsedFilter = { field: 'name', operator: 'STARTS_WITH', value: 'John' };
        expect(matchesFilter({ name: 'John Doe' }, filter)).toBe(true);
        expect(matchesFilter({ name: 'Jane Doe' }, filter)).toBe(false);
      });

      it('should be case-insensitive', () => {
        const filter: ParsedFilter = { field: 'name', operator: 'STARTS_WITH', value: 'john' };
        expect(matchesFilter({ name: 'JOHN DOE' }, filter)).toBe(true);
      });
    });

    describe('IS_NULL operator', () => {
      it('should match null values', () => {
        const filter: ParsedFilter = { field: 'phone', operator: 'IS_NULL', value: null };
        expect(matchesFilter({ phone: null }, filter)).toBe(true);
        expect(matchesFilter({ phone: undefined }, filter)).toBe(true);
        expect(matchesFilter({}, filter)).toBe(true);
        expect(matchesFilter({ phone: '+123' }, filter)).toBe(false);
      });
    });

    describe('IS_NOT_NULL operator', () => {
      it('should match non-null values', () => {
        const filter: ParsedFilter = { field: 'email', operator: 'IS_NOT_NULL', value: null };
        expect(matchesFilter({ email: 'test@test.com' }, filter)).toBe(true);
        expect(matchesFilter({ email: null }, filter)).toBe(false);
        expect(matchesFilter({}, filter)).toBe(false);
      });
    });

    describe('nested fields', () => {
      it('should filter by nested field path', () => {
        const filter: ParsedFilter = { field: 'contact.email', operator: 'CONTAINS', value: '@test' };
        expect(matchesFilter({ contact: { email: 'john@test.com' } }, filter)).toBe(true);
        expect(matchesFilter({ contact: { email: 'john@other.com' } }, filter)).toBe(false);
      });
    });
  });

  describe('filterArray', () => {
    const testData = [
      { id: '1', name: 'John', status: 'active', age: 25 },
      { id: '2', name: 'Jane', status: 'inactive', age: 30 },
      { id: '3', name: 'Bob', status: 'active', age: 20 }
    ];

    it('should filter array by equality', () => {
      const filter: ParsedFilter = { field: 'status', operator: '=', value: 'active' };
      const result = filterArray(testData, filter);
      expect(result).toHaveLength(2);
      expect(result.map((r: any) => r.id)).toEqual(['1', '3']);
    });

    it('should filter array by comparison', () => {
      const filter: ParsedFilter = { field: 'age', operator: '>', value: '22' };
      const result = filterArray(testData, filter);
      expect(result).toHaveLength(2);
      expect(result.map((r: any) => r.id)).toEqual(['1', '2']);
    });

    it('should return empty array when no matches', () => {
      const filter: ParsedFilter = { field: 'status', operator: '=', value: 'deleted' };
      const result = filterArray(testData, filter);
      expect(result).toEqual([]);
    });
  });

  describe('applyFilter', () => {
    it('should filter array', () => {
      const data = [
        { id: '1', status: 'active' },
        { id: '2', status: 'inactive' }
      ];
      const result = applyFilter(data, 'status = active');
      expect(result.result).toEqual([{ id: '1', status: 'active' }]);
      expect(result.error).toBeUndefined();
    });

    it('should filter single object', () => {
      const obj = { id: '1', status: 'active' };
      const matchResult = applyFilter(obj, 'status = active');
      expect(matchResult.result).toEqual(obj);

      const noMatchResult = applyFilter(obj, 'status = inactive');
      expect(noMatchResult.result).toBeNull();
    });

    it('should return error for invalid filter', () => {
      const result = applyFilter([{ id: '1' }], 'invalid filter');
      expect(result.error).toBeDefined();
      expect(result.error).toContain('Invalid filter expression');
    });

    it('should pass through when filter is empty', () => {
      const data = [{ id: '1' }, { id: '2' }];
      expect(applyFilter(data, '')).toEqual({ result: data });
      expect(applyFilter(data, undefined)).toEqual({ result: data });
    });
  });
});
