---
title: PR Creation Best Practices
impact: HIGH
impactDescription: PRs that don't follow guidelines slow down review cycles
tags: pull-request, code-review, workflow
---

# PR Creation Best Practices

## PR Title

- Use conventional commits: `feat:`, `fix:`, `refactor:`
- Be specific: `fix: handle timezone edge case in booking creation`
- Not generic: `fix: booking bug`

## PR Requirements

- PR title must follow Conventional Commits specification
- For most PRs, you only need to run linting and type checking
- E2E tests will only run if PR has "ready-for-e2e" label

## Before Pushing

Run checks scoped to what you changed — not the whole repo.

1. Type-check the affected workspace(s) only, e.g. `yarn workspace @calcom/web type-check`. Avoid `yarn type-check:ci --force` unless you're debugging a cross-package issue.
2. Lint/format only changed files: `yarn biome check --write --changed --since=origin/main`
3. Run the relevant tests for the code you touched (not the full suite).
