# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Build & Development
- `npm run build` - TypeScript compilation to dist/
- `npm start` - Start HTTP server (production)
- `npm run start:stdio` - Start stdio MCP server (for Claude Desktop)
- `npm run start:http` - Start HTTP MCP server (for web apps)

### Testing
- `npm test` - Run Jest test suite
- `npm run test:watch` - Watch mode testing
- `npm run test:coverage` - Coverage reports
- `npm run lint` - TypeScript type checking

## Architecture Overview

This is a Model Context Protocol (MCP) server that provides 269+ tools for GoHighLevel CRM integration. The architecture follows a modular tool-based design:

### Core Components
- **src/server.ts** - Main stdio MCP server for Claude Desktop
- **src/http-server.ts** - HTTP MCP server for web deployments
- **src/clients/ghl-api-client.ts** - Centralized GoHighLevel API client with comprehensive error handling
- **src/types/ghl-types.ts** - Complete TypeScript definitions for all API entities

### Tool Categories (19 categories, 269+ tools)
- **ContactTools** (31 tools) - Contact management, tasks, notes, followers
- **ConversationTools** (20 tools) - SMS, email, conversations, recordings
- **BlogTools** (7 tools) - Blog post creation, management, SEO
- **OpportunityTools** (10 tools) - Sales pipeline, opportunity management
- **CalendarTools** (14 tools) - Appointments, availability, scheduling
- **EmailTools** (5 tools) - Email campaigns and templates
- **LocationTools** (24 tools) - Sub-account management, custom fields
- **SocialMediaTools** (17 tools) - Multi-platform social media management
- **MediaTools** (3 tools) - File upload and management
- **ObjectTools** (9 tools) - Custom objects and records
- **AssociationTools** (10 tools) - Entity relationships
- **CustomFieldV2Tools** (8 tools) - Advanced custom field management
- **WorkflowTools** (1 tool) - Automation workflow discovery
- **SurveyTools** (2 tools) - Survey management and submissions
- **StoreTools** (18 tools) - E-commerce shipping and store settings
- **ProductsTools** (10 tools) - Product catalog management
- **PaymentsTools** (20 tools) - Payment processing and integration
- **InvoicesTools** (39 tools) - Comprehensive billing system

### Key Patterns
- Each tool category is implemented as a separate class with consistent patterns
- All tools use the centralized GHLApiClient for API communication
- Tools implement MCP schema validation and comprehensive error handling
- TypeScript strict mode ensures type safety across all API interactions

### Configuration
- Environment variables are managed through dotenv
- API keys and location IDs are passed via request headers (not env vars)
- Supports both stdio (Claude Desktop) and HTTP (web) transport protocols

### Testing Strategy
- Jest with TypeScript support
- Mocked API client for isolated testing
- Integration tests for tool functionality
- Coverage reporting for quality assurance

This codebase is designed for production deployment on Vercel, Railway, or Render with full Claude Desktop integration via MCP protocol.