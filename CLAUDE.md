# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Context

This is a **bounty-focused fork** of Cal.com for working on performance optimization bounty #23104 (Local dev environment slow - 14.5+ seconds). The goal is to reduce dev server load time to under 7 seconds by optimizing App Store module loading.

**Bounty Details:**
- Issue: https://github.com/calcom/cal.com/issues/23104
- Reward: $2,000 USD via Algora.io
- Primary challenge: App Store compiles 100+ integration apps on every page load
- Critical requirement: ALL tests must pass

## Repository Structure

Cal.com is a **Turborepo monorepo** with the following structure:

### Main Applications (`apps/`)
- **`apps/web/`** - Next.js 14 main web application (primary focus for bounty work)
- **`apps/api/`** - REST API v1/v2
- **`apps/ui-playground/`** - Storybook for UI components

### Core Packages (`packages/`)
- **`packages/app-store/`** - 100+ integration apps (Google Calendar, Stripe, Zoom, etc.) - **PRIMARY BOUNTY TARGET**
- **`packages/features/`** - Shared feature components
- **`packages/prisma/`** - Database schema and Prisma client
- **`packages/trpc/`** - tRPC API definitions
- **`packages/ui/`** - Shared UI components
- **`packages/lib/`** - Shared utilities
- **`packages/emails/`** - Email templates
- **`packages/embeds/`** - Embed library

## Development Commands

### Setup & Installation
```bash
# Install dependencies (uses Yarn 3.4.1)
yarn

# Set up environment (copy .env.example to .env and configure)
openssl rand -base64 32  # Generate NEXTAUTH_SECRET
openssl rand -base64 32  # Generate CALENDSO_ENCRYPTION_KEY

# Quick start with Docker (includes Postgres and test users)
yarn dx

# Manual database setup
yarn workspace @calcom/prisma db-migrate    # Development
yarn workspace @calcom/prisma db-deploy     # Production
yarn workspace @calcom/prisma db-seed       # Seed test data
```

### Development
```bash
yarn dev              # Start web app only
yarn dev:all          # Start web + website + console
yarn dev:api          # Start web + API
yarn build            # Production build (CRITICAL: run before committing)
yarn start            # Start production build
```

### Testing (CRITICAL for bounty - all must pass)
```bash
yarn test             # Unit tests
yarn test-e2e         # E2E tests (run after db-seed)
yarn test:ui          # Vitest UI
yarn lint             # ESLint
yarn lint:fix         # Auto-fix linting issues
yarn type-check       # TypeScript type checking
```

### Performance Analysis (for bounty work)
```bash
# Measure dev server start time
time yarn dev

# Bundle analysis
ANALYZE=true yarn build
```

### Database
```bash
yarn db-studio        # Open Prisma Studio
yarn prisma           # Direct Prisma CLI access
```

## Key Architecture Patterns

### App Store Architecture (BOUNTY FOCUS)
The App Store (`packages/app-store/`) contains 100+ integration apps with:
- **Problem**: All apps load statically on every page via `@calcom/app-store` imports
- **Impact**: 14.5+ second dev server load time
- **Root causes**:
  - Circular dependencies between apps
  - Static imports in Shell component (`packages/features/shell/Shell.tsx`)
  - Heavy components (KBar) imported eagerly
  - Webpack bundles all apps into large chunks

**Key files to analyze for bounty:**
- `packages/app-store/index.ts` - Main export/import registry
- `packages/app-store/_appRegistry.ts` - App registration system
- `packages/features/shell/Shell.tsx` - Loads heavy components
- `apps/web/app/(use-page-wrapper)/(main-nav)/layout.tsx` - Root layout
- `apps/web/next.config.js` - Webpack configuration (lines 245-288)

### Monorepo Build System
- **Turborepo** for parallel builds and caching
- **Next.js 14** with App Router and Pages Router hybrid
- **TypeScript** with strict mode
- **Prisma** for database ORM
- **tRPC** for type-safe API

### Code Organization Rules (from .cursor/rules/review.mdc)
- Prefer **early returns** over nesting
- Prefer **composition** over prop drilling
- **File naming**:
  - Repository files: `Prisma<Entity>Repository.ts` (e.g., `PrismaAppRepository.ts`)
  - Service files: `<Entity>Service.ts` (e.g., `MembershipService.ts`)
  - No dot-suffixes (`.service.ts`, `.repository.ts`) in new files

### Database (Prisma)
- **CRITICAL**: Never use `include` - always use `select` to explicitly choose fields
- **SECURITY**: Never return `credential.key` field from tRPC/API endpoints
- Avoid O(n²) queries - optimize to O(n log n) or O(n)

### Frontend
- **Always use `t()` for localization** - no hardcoded strings
- Avoid excessive Day.js in hot paths - prefer `.utc()` or native Date for performance
- Check for circular references during code changes

## Next.js Configuration

### Webpack Customization (apps/web/next.config.js:245-288)
```javascript
webpack: (config, { webpack, buildId, isServer, dev }) => {
  // Memory caching in dev, frozen cache in prod
  // Server-side: IgnorePlugin for optional deps
  // PrismaPlugin for monorepo support
  // Module rules for barrel optimization
}
```

### Transpiled Packages (next.config.js:222-231)
All internal packages are transpiled:
- `@calcom/app-store` (BOUNTY TARGET)
- `@calcom/features`
- `@calcom/prisma`
- `@calcom/trpc`
- etc.

### Modular Imports (next.config.js:232-241)
Optimizes imports from:
- `@calcom/features/insights/components`
- `lodash`

## Testing Requirements

### Critical for Bounty Success
1. **All unit tests must pass**: `yarn test`
2. **All E2E tests must pass**: `yarn test-e2e`
3. **Production build must succeed**: `yarn build`
4. **Type checking must pass**: `yarn type-check`
5. **Linting must pass**: `yarn lint`

### E2E Testing
- Uses Playwright
- Requires test browsers: `npx playwright install`
- Requires database seed: `yarn db-seed`
- Environment variable: `NEXT_PUBLIC_IS_E2E=1`

## Performance Optimization Guidelines (for bounty)

### Measurement Baseline
```bash
# Before changes
time yarn dev  # Current: ~14.5 seconds

# Target: <7 seconds (must beat previous PR #23468 which achieved 9.5s)
```

### Optimization Strategies to Consider
1. **Route-based code splitting** - Load apps only when their routes are accessed
2. **Dynamic imports** - Replace static imports with `next/dynamic`
3. **Webpack chunk optimization** - Configure `splitChunks` for app categories
4. **Lazy initialization** - Defer app loading until needed
5. **Circular dependency resolution** - Break import cycles

### Files to Modify (tentative)
- `packages/app-store/index.ts` - Create lazy export registry
- `packages/features/shell/Shell.tsx` - Lazy load KBar and heavy components
- `apps/web/next.config.js` - Optimize webpack chunking
- Any files with static `@calcom/app-store` imports

## Git & Pull Requests

### Commit Requirements (from global CLAUDE.md)
- **MANDATORY**: Run `git status` and `git diff --cached` before committing
- **MANDATORY**: Verify correct repository with `pwd`
- **MANDATORY**: Check for submodule warnings - STOP if you see them
- Use semantic commit messages: `perf: lazy load App Store modules`
- Include co-author: `Co-Authored-By: Claude <noreply@anthropic.com>`

### PR Requirements (for bounty)
- **Title**: `perf: Optimize local dev performance via lazy App Store loading`
- **Must include**:
  - Performance metrics (before/after with evidence)
  - Technical explanation of approach
  - Test results showing all tests pass
  - `Fixes #23104`
  - `/claim #23104` (critical for Algora bounty)
- **Branch**: `fix/local-dev-performance-23104`
- Follow contribution guidelines in CONTRIBUTING.md

### PR Size Guidelines
- For large PRs (>500 lines or >10 files), split by:
  - Feature boundaries
  - Layer/component (frontend, backend, DB, tests)
  - Dependency chain (sequential PRs)
  - File/module grouping

## Environment Variables

### Required
- `NEXTAUTH_SECRET` - Auth encryption key
- `CALENDSO_ENCRYPTION_KEY` - Data encryption key
- `DATABASE_URL` - PostgreSQL connection string
- `NEXTAUTH_URL` - App URL for auth

### Development
- `NODE_OPTIONS="--max-old-space-size=16384"` - Increase memory for builds
- `NEXT_PUBLIC_LOGGER_LEVEL` - Control tRPC logging (0-6)
- `ANALYZE=true` - Enable webpack bundle analyzer

See `.env.example` and `.env.appStore.example` for complete list.

## Code Quality Standards

### From .cursor/rules/review.mdc
- Prefer early returns to reduce nesting
- Use composition over prop drilling
- Prisma: **select** over **include**
- Never expose `credential.key` in APIs
- Always use `t()` for localization
- Avoid O(n²) logic
- No circular references
- Minimize Day.js in hot paths (use `.utc()` or native Date)

### File Naming
- Repository classes: `Prisma<Entity>Repository.ts`
- Service classes: `<Entity>Service.ts`
- Avoid `.service.ts` or `.repository.ts` suffixes in new files
- Reserve `.test.ts`, `.spec.ts`, `.types.ts` for their purposes

## Bounty Success Criteria

✅ **Technical Requirements:**
1. Dev server start time < 7 seconds (from 14.5s baseline)
2. All tests pass without modification
3. Production build succeeds
4. No runtime performance degradation
5. Maintainable, well-documented solution

✅ **Process Requirements:**
1. PR follows contribution guidelines
2. Performance metrics included with evidence
3. `/claim #23104` in PR description
4. Algora bot confirms bounty claim

✅ **Payment:**
- $2,000 USD via Algora/Stripe upon PR merge

## Additional Resources

- **Documentation**: `docs/` directory
- **Contributing Guide**: CONTRIBUTING.md
- **Security**: SECURITY.md
- **Agents/Prompts**: `.agents/` directory
- **Changesets**: Use for version bumps and changelogs
