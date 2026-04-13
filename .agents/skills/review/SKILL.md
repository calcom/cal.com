---
name: review
description: Review a PR against Cal.com engineering rules. Use when asked to review a PR, self-review before requesting human review, or check compliance against team standards.
---

# PR Review

Reviews a PR diff against Cal.com's engineering rules in `.agents/rules/` and produces a structured compliance report with actionable findings.

## Steps

### 1. Get the PR diff

Use the PR number/repo if provided, otherwise work with the current branch's PR.

Read the diff and identify what areas of the codebase are affected (e.g., API endpoints, data layer, frontend components, tests, CI config).

### 2. Read the rules — selectively

Read from `.agents/rules/` based on what the diff touches. Do not read every rule for every PR.

**Always read (CRITICAL/HIGH — apply to every PR):**

- `.agents/rules/quality-*` — Code quality, review standards, naming, imports, comments
- `.agents/rules/architecture-*` — Vertical slices, feature boundaries, circular dependencies, auth placement
- `.agents/rules/ci-*` — Git workflow and CI standards

**Read based on what the diff touches:**

| Diff touches | Read these rules |
|---|---|
| Database, Prisma, repository files | `rules/data-*` |
| API routes, controllers, endpoints | `rules/api-*` |
| Test files, or new code without tests | `rules/testing-*` |
| Loops, queries, date operations | `rules/performance-*` |
| New DI, factory, or workflow patterns | `rules/patterns-*` |

**Skip (not actionable per-PR):**

- `rules/reference-*` — Informational lookups, not review criteria
- `rules/culture-*` — Team culture, not code-level checks

### 3. Evaluate the diff

Check compliance against the rules you read, plus these baseline checks:

- **Correctness** — Bugs, logic errors, off-by-one, race conditions, null/undefined handling
- **Security** — Injection, hardcoded secrets, improper auth checks, exposed `credential.key`
- **Deferred quality** — TODO/FIXME/HACK in new code that should be addressed now; "follow-up PR" markers for small fixable things
- **PR hygiene** — Does the description match the changes? Is the PR focused on a single concern? Should large changes (>500 lines or >10 files) be split?
- **Simplicity** — Over-engineering, unnecessary abstractions, cleverness over clarity
- **Test coverage** — Are new code paths tested? Are tests meaningful?
- **Observability** — Server-side code should use `logger` (not `console.log`). Meaningful user-facing actions should be tracked with PostHog events.

Only flag violations clearly present in the diff — do not speculate about code outside the diff. Do not flag style/formatting issues (Biome handles this automatically).

### 4. Output the report

```markdown
# Review: <PR Title>

**URL**: <url> | **Branches**: `<source>` → `<target>`

## Rules Checked
- **Always checked**: <list of CRITICAL/HIGH rule categories read>
- **Checked based on diff**: <list of selectively read rules and why>
- **Skipped**: <list of skipped categories and why>

## Findings

### 🔴 Must Fix
- **<file:line>**: <issue and suggested fix>

### 🟡 Should Fix
- **<file:line>**: <issue and suggested fix>

### ✅ Rules Followed Well
- <Brief list of rules the PR follows correctly>

## Verdict: <✅ Ready for Review / 🟡 Minor Issues / 🔴 Needs Work>

<One sentence: what's the #1 thing to address, or confirmation that the PR looks good>
```

Skip empty sections. Keep the report concise.

### 5. Offer next steps

After outputting the report, ask the user:

- **If "Must Fix" or "Should Fix" issues exist**: Whether to auto-fix the issues now or leave them for manual fixing.
- **If PR description doesn't match the diff**: Whether to update the PR description.
- **Always as a final step**: "Mark PR as ready for review?", "Fix issues first?", or "Leave as draft?"

Before offering "Mark PR as ready for review", check CI status — if any checks are still pending or failing, warn the user that CI must pass first.

## Severity Guide

### Must Fix (block merge)

1. **Security** — Exposed `credential.key`, committed secrets, Prisma `include` leaking sensitive fields
2. **Breaking API changes** — Changed/removed public API fields without versioning
3. **Architecture violations** — Broken dependency hierarchy, circular dependencies
4. **Correctness** — Obvious bugs, unhandled edge cases, logic errors

### Should Fix (strong recommendation)

5. **Performance** — O(n^2) patterns, excessive Day.js in hot paths
6. **Pattern violations** — Direct Prisma in services, business logic in repositories
7. **Import hygiene** — Barrel imports, missing `import type`
8. **File naming** — New files not using `kebab-case`
9. **Localization** — Hardcoded UI strings instead of `t()`
10. **PR size** — Over 500 lines or 10 files
