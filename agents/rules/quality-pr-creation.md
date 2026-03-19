---
title: PR Creation Best Practices
impact: HIGH
impactDescription: PRs that don't follow guidelines slow down review cycles
tags: pull-request, code-review, workflow
---

# PR Creation Best Practices

## Draft Mode

Create pull requests in draft mode by default, so that a human reviewer can mark it as ready for review only when it is.

## PR Title

- Use conventional commits: `feat:`, `fix:`, `refactor:`
- Be specific: `fix: handle timezone edge case in booking creation`
- Not generic: `fix: booking bug`

## Size Limits

- **Large PRs** (>500 lines or >10 files) are not recommended
- Split large changes by layer (database, backend, frontend)
- Split by feature component (API, UI, integration)

## PR Requirements

- PR title must follow Conventional Commits specification
- For most PRs, you only need to run linting and type checking
- E2E tests will only run if PR has "ready-for-e2e" label

## Before Pushing

1. Run `yarn type-check:ci --force` to check types
2. Run `yarn biome check --write .` to lint and format
3. Run relevant tests locally
