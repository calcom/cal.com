# Cal.com Development Guide for AI Agents

**📖 Complete documentation is now in the [.agents/](.agents/) directory.**

## Quick Reference

### Essential Commands

- `yarn dev` - Start development server
- `yarn build` - Build all packages
- `yarn lint:fix` - Lint and fix code
- `yarn type-check` - TypeScript checking
- `yarn test <filename> -- --integrationTestsOnly` - Run integration tests
- `yarn e2e <filename> --grep "<testName>"` - Run specific E2E test

### Key Guidelines

- **Imports**: Avoid barrel imports (no importing from index.ts files)
- **Prisma**: Use `select` not `include`, never expose `credential.key`
- **Localization**: Always use `t()` for user-facing text
- **Performance**: Avoid O(n²) logic, minimize Day.js in hot paths
- **PRs**: Split large PRs (>500 lines) by feature/layer boundaries

## 📚 Detailed Documentation

- **[.agents/README.md](.agents/README.md)** - Complete development guide
- **[.agents/commands.md](.agents/commands.md)** - All build, test & dev commands
- **[.agents/coding-standards.md](.agents/coding-standards.md)** - Detailed style guide & best practices
