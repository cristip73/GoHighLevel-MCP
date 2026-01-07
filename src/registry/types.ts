/**
 * Progressive Disclosure Registry Types
 *
 * Types for the tool registry that enables search/describe/execute pattern
 * to reduce token usage by not exposing all 254 tools at once.
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';

/**
 * Extended tool metadata with domain classification and search-friendly fields
 */
export interface ToolMetadata {
  /** Tool name (e.g., "create_contact") */
  name: string;

  /** Domain/category (e.g., "contacts", "calendar") */
  domain: string;

  /** Short summary for search results, max 100 chars */
  summary: string;

  /** Full description from original tool definition */
  description: string;

  /** Complete JSON Schema for input validation */
  inputSchema: Record<string, unknown>;

  /** List of required parameter names */
  requiredParams: string[];

  /** Search tags derived from name and description */
  tags: string[];

  /** Original MCP Tool definition for describe_tools */
  originalTool: Tool;
}

/**
 * Compact search result returned by search_tools
 */
export interface SearchResult {
  /** Tool name */
  name: string;

  /** Domain/category */
  domain: string;

  /** Short summary */
  summary: string;

  /** Required parameters for quick reference */
  requiredParams: string[];

  /** Search relevance score (0-1) */
  relevance: number;
}

/**
 * Domain information for list_domains
 */
export interface DomainInfo {
  /** Domain identifier */
  name: string;

  /** Number of tools in this domain */
  toolCount: number;

  /** Human-readable description of the domain */
  description: string;

  /** Example tool names from this domain */
  exampleTools: string[];
}

/**
 * Result from execute_tool including success/error info
 */
export interface ExecuteResult {
  success: boolean;
  result?: unknown;
  error?: string;
  validationErrors?: string[];
}

/**
 * Search options for the registry
 */
export interface SearchOptions {
  /** Filter by domain */
  domain?: string;

  /** Maximum results to return */
  limit?: number;

  /** Minimum relevance score (0-1) */
  minRelevance?: number;
}

/**
 * All available domain names as a type
 */
export type DomainName =
  | 'contacts'
  | 'conversations'
  | 'calendar'
  | 'opportunities'
  | 'locations'
  | 'blog'
  | 'social'
  | 'email'
  | 'media'
  | 'objects'
  | 'associations'
  | 'customfields'
  | 'products'
  | 'store'
  | 'payments'
  | 'invoices'
  | 'surveys'
  | 'workflows'
  | 'verification';

/**
 * List of all domain names for validation
 */
export const DOMAIN_NAMES: DomainName[] = [
  'contacts',
  'conversations',
  'calendar',
  'opportunities',
  'locations',
  'blog',
  'social',
  'email',
  'media',
  'objects',
  'associations',
  'customfields',
  'products',
  'store',
  'payments',
  'invoices',
  'surveys',
  'workflows',
  'verification'
];
