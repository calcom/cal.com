# Cal.com Development Guide for AI Agents

**📖 Complete documentation is in the [.agents/](.agents/) directory.**

## Quick Reference

### Essential Commands

- `yarn dev` - Start development server
- `yarn build` - Build all packages
- `yarn lint:fix` - Lint and fix code
- `yarn type-check` - TypeScript checking
- `yarn test <filename> -- --integrationTestsOnly` - Run integration tests
- `yarn e2e <filename> --grep "<testName>"` - Run specific E2E test

## Tool Preferences

### Search Tools Priority

Use tools in this order of preference:

1. **ast-grep** - For AST-based code searches (if available)
2. **rg (ripgrep)** - For fast text searches
3. **grep** - As fallback for text searches

## 📚 Detailed Documentation

- **[.agents/README.md](.agents/README.md)** - Complete development guide
- **[.agents/commands.md](.agents/commands.md)** - All build, test & dev commands
- **[.agents/knowledge-base.md](.agents/knowledge-base.md)** - Knowledge base & best practices
