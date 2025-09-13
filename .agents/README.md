# Cal.com Development Guide for AI Agents

This directory contains comprehensive documentation for AI agents working on the Cal.com codebase.

## Quick Navigation

- **[Commands](commands.md)** - Build, test, and development commands
- **[Knowledge Base](knowledge-base.md)** - Knowledge base & best practices
- **[Architecture Overview](#architecture-overview)** - System structure and patterns

## Getting Started

Cal.com is a monorepo using Yarn workspaces and Turbo for build orchestration. The main application is in `apps/web/` with shared packages in `packages/`.

### Key Directories

- `apps/web/` - Main Next.js application
- `packages/prisma/` - Database schema and migrations
- `packages/trpc/` - API layer using tRPC
- `packages/ui/` - Shared UI components
- `packages/features/` - Feature-specific code
- `packages/app-store/` - Third-party app integrations

## Architecture Overview

### Database Layer

- **Prisma ORM** with PostgreSQL
- Schema in `packages/prisma/schema.prisma`
- Always use `select` instead of `include` for better performance
- Never expose `credential.key` field in API responses

### API Layer

- **tRPC** for type-safe APIs
- Routers in `packages/trpc/server/routers/`
- Authentication handled via NextAuth.js

### Frontend

- **Next.js 13+** with App Router in some areas
- **React 18** with TypeScript
- **Tailwind CSS** for styling
- Internationalization with `next-i18next`

## Common Patterns

### Error Handling

- Use early returns to reduce nesting
- Throw descriptive errors with proper error codes
- Prefer composition over prop drilling

### Performance

- Avoid O(n²) logic in backend code
- Minimize Day.js usage in performance-critical paths
- Use `select` queries to only fetch needed data
- Consider using `.utc()` for Day.js operations

### Security

- Never commit secrets or API keys
- Always validate input data
- Use proper authentication checks
- Never expose sensitive credential fields

## Testing Strategy

- **Unit tests** with Vitest
- **Integration tests** for complex workflows
- **E2E tests** with Playwright
- Test files use `.test.ts` or `.spec.ts` extensions

## Pull Request Guidelines

For large PRs (>500 lines or >10 files):

- Split by feature boundaries
- Separate database migrations, backend logic, frontend components
- Create dependency chains that can be merged sequentially
- Pattern: Database → Backend → Frontend → Tests
