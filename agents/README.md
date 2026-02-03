# Cal.com Agent Documentation Index

- **[../AGENTS.md](../AGENTS.md)** - Main guide (structure, tech stack, commands, examples)
- **[commands.md](commands.md)** - Command reference
- **[knowledge-base.md](knowledge-base.md)** - Domain knowledge and business rules

## Rules Index

### Architecture

- [architecture-vertical-slices](rules/architecture-vertical-slices.md) - Vertical slice architecture
- [architecture-feature-boundaries](rules/architecture-feature-boundaries.md) - Feature boundaries
- [architecture-page-level-auth](rules/architecture-page-level-auth.md) - Auth in page.tsx, not layout.tsx
- [architecture-features-modules](rules/architecture-features-modules.md) - packages/features vs apps/web/modules

### Quality

- [quality-avoid-barrel-imports](rules/quality-avoid-barrel-imports.md) - Avoid index.ts barrel imports
- [quality-simplicity](rules/quality-simplicity.md) - Keep code simple
- [quality-no-followup-prs](rules/quality-no-followup-prs.md) - Complete work in PR
- [quality-thorough-code-review](rules/quality-thorough-code-review.md) - Code review standards
- [quality-error-handling](rules/quality-error-handling.md) - ErrorWithCode vs TRPCError
- [quality-imports](rules/quality-imports.md) - Import patterns and named exports
- [quality-pr-creation](rules/quality-pr-creation.md) - PR best practices
- [quality-code-comments](rules/quality-code-comments.md) - Comment guidelines
- [quality-code-review](rules/quality-code-review.md) - Code review focus

### Data Layer

- [data-prefer-select-over-include](rules/data-prefer-select-over-include.md) - Use select in Prisma queries
- [data-repository-pattern](rules/data-repository-pattern.md) - Repository pattern
- [data-repository-methods](rules/data-repository-methods.md) - Repository method standards
- [data-dto-boundaries](rules/data-dto-boundaries.md) - DTO boundaries
- [data-prisma-migrations](rules/data-prisma-migrations.md) - Schema changes and migrations
- [data-prisma-feature-flags](rules/data-prisma-feature-flags.md) - Feature flag seeding

### API

- [api-no-breaking-changes](rules/api-no-breaking-changes.md) - API stability
- [api-thin-controllers](rules/api-thin-controllers.md) - Thin controller pattern

### Performance

- [performance-avoid-quadratic](rules/performance-avoid-quadratic.md) - Avoid O(n²) algorithms
- [performance-dayjs-usage](rules/performance-dayjs-usage.md) - Day.js optimization
- [performance-scheduling-complexity](rules/performance-scheduling-complexity.md) - Scheduling performance

### Testing

- [testing-coverage-requirements](rules/testing-coverage-requirements.md) - Test coverage standards
- [testing-playwright](rules/testing-playwright.md) - Playwright test execution
- [testing-mocking](rules/testing-mocking.md) - Mock services and integrations
- [testing-timezone](rules/testing-timezone.md) - Timezone handling (TZ=UTC)
- [testing-incremental](rules/testing-incremental.md) - Incremental test fixing

### CI/CD

- [ci-check-failures](rules/ci-check-failures.md) - Handling CI failures
- [ci-type-check-first](rules/ci-type-check-first.md) - Type-check before tests
- [ci-git-workflow](rules/ci-git-workflow.md) - Git and CI workflow

### Patterns

- [patterns-dependency-injection](rules/patterns-dependency-injection.md) - DI patterns
- [patterns-factory-pattern](rules/patterns-factory-pattern.md) - Factory pattern
- [patterns-workflow-triggers](rules/patterns-workflow-triggers.md) - Workflow implementation
- [patterns-app-store](rules/patterns-app-store.md) - App store integration patterns

### Culture

- [culture-accountability](rules/culture-accountability.md) - Engineering accountability
- [culture-leverage-ai](rules/culture-leverage-ai.md) - AI tooling practices

### Reference

- [reference-file-locations](rules/reference-file-locations.md) - Key file paths
- [reference-local-dev](rules/reference-local-dev.md) - Local development setup
