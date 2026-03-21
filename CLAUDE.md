# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Build & Development
- `pnpm build` - Compile TypeScript to JavaScript
- `pnpm clean` - Remove dist/ directory
- `pnpm sample` - Run example code from samples/

### Testing
- `pnpm test` - Run all tests (unit, integration, e2e)
- `pnpm test:unit` - Unit tests only
- `pnpm test:integration` - Integration tests only
- `pnpm test:e2e` - End-to-end tests only
- `pnpm test:watch` - Unit tests in watch mode
- `pnpm test:integration:watch` - Integration tests in watch mode
- `pnpm test:e2e:watch` - E2E tests in watch mode

### Code Quality
- `pnpm lint` - Check code style and formatting
- `pnpm lint:fix` - Auto-fix linting issues
- `pnpm format` - Format code with Prettier
- `pnpm format:check` - Check formatting without changing files

**Required before committing:** Run `pnpm lint`, `pnpm build`, and `pnpm test`

## Architecture

This is a TypeScript client library for the Substack API using a service-oriented architecture.
All requests go directly to Substack's API via CycleTLS (bypasses Cloudflare bot detection).

### Core Structure
- **SubstackClient** (`src/substack-client.ts`) - Main client class that orchestrates services; has `close()` for cleanup
- **Services** (`src/internal/services/`) - Business logic organized by domain (posts, notes, profiles, comments, etc.)
- **Domain Models** (`src/domain/`) - Entity classes with methods (Profile, Post, Note, Comment)
- **HTTP Layer** (`src/internal/http-client.ts`) - CycleTLS-based client with lazy init, dual base URLs (global vs publication), rate limiting, and explicit `close()`
- **io-ts codecs** (`src/internal/types/substack-responses.ts`) - Runtime validation matching real Substack API response shapes

### Authentication
Two cookies sent directly to Substack (no proxy):
- `substack.sid` — main session cookie
- `substack.lli` — secondary session identifier
- Sent as: `Cookie: substack.sid=${sid}; substack.lli=${lli}`

### API URL Patterns
- **Global**: `https://substack.com/api/v1/...` (profiles, feeds, reactions, notes)
- **Publication-scoped**: `https://{pub}.substack.com/api/v1/...` (posts by slug, comments)
- HttpClient `scope` parameter: `'global'`, `'publication'`, or `{ subdomain: 'name' }`

### Key Patterns
- **Entity-based API**: Domain objects have methods (e.g., `post.comments()`, `profile.posts()`)
- **Iterator Pattern**: Cursor-based pagination via async iterators (`for await (const post of profile.posts())`)
- **Service Layer**: Separation of HTTP concerns from business logic
- **io-ts**: Runtime type validation for all API responses via `decodeOrThrow`
- **CycleTLS lifecycle**: Lazy-initialized Go subprocess; must call `client.close()` when done

### Dependencies
- **cycletls**: TLS fingerprint spoofing to bypass Cloudflare
- **io-ts** / **fp-ts**: Runtime type validation
- **Jest**: Testing framework with separate configs for unit/integration/e2e tests

### Testing Strategy
- **Unit tests**: Mock CycleTLS responses, test business logic
- **Integration tests**: Mock CycleTLS with route-based handler, test full client flow
- **E2E tests**: Full workflow tests requiring API credentials

### File Organization
- `src/domain/` - Domain entities (Profile, Post, Note, Comment)
- `src/internal/` - Internal services, HTTP client, validation, types
- `src/types/` - Public type definitions
- `tests/unit/` - Unit tests
- `tests/integration/` - Integration tests
- `tests/e2e/` - End-to-end tests
- `samples/` - Example usage code
- `scripts/` - Discovery and utility scripts (not published)

### API Limitations
- **No post-by-ID**: Use `getPostBySlug(slug, subdomain)` — posts only available by slug on publication domain
- **No note-by-ID**: Single note lookup not available via Substack API
- **No `/me` endpoint**: Own profile requires `handle` in config

## Commit Guidelines

Follow [Conventional Commits](https://www.conventionalcommits.org/):
- `feat: add post scheduling`
- `fix: correct auth token refresh`
- `chore: update dependencies`

Pull request titles should use the same format.
