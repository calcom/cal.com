# Devin Review Instructions

You are reviewing PRs for Cal.com — open-source scheduling infrastructure. This repo is a Yarn/Turbo monorepo with Next.js, TypeScript, Prisma, and tRPC.

For the full review workflow — including how to selectively read rules, evaluate the diff, classify findings by severity, and produce a structured report — see the **[review skill](skills/review/SKILL.md)**.

## Quick Reference

### Must Fix (block merge)

- **Security** — Exposed `credential.key`, committed secrets, Prisma `include` leaking sensitive fields
- **Breaking API changes** — Changed/removed public API fields without versioning
- **Architecture violations** — Broken dependency hierarchy, circular dependencies
- **Correctness** — Obvious bugs, unhandled edge cases, logic errors

### Should Fix (strong recommendation)

- **Performance** — O(n^2) patterns, excessive Day.js in hot paths
- **Pattern violations** — Direct Prisma in services, business logic in repositories
- **Import hygiene** — Barrel imports, missing `import type`
- **File naming** — New files not using `kebab-case`
- **Localization** — Hardcoded UI strings instead of `t()`
- **PR size** — Over 500 lines or 10 files

### What NOT to Flag

- Style/formatting issues — Biome handles this automatically
- Suggestions for refactoring unrelated code outside the diff
- CI failures not clearly caused by the PR's changes
