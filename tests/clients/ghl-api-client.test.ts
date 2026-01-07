/**
 * Unit Tests for GHL API Client
 * Basic module structure tests
 */

import { describe, it, expect } from '@jest/globals';
import { GHLApiClient } from '../../src/clients/ghl-api-client.js';

describe('GHLApiClient', () => {
  it('should be defined', () => {
    expect(GHLApiClient).toBeDefined();
  });

  it('should be a class/function', () => {
    expect(typeof GHLApiClient).toBe('function');
  });
});
