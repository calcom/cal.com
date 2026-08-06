---
title: Git and CI Workflow
impact: HIGH
impactDescription: Incorrect workflow causes wasted CI cycles and confusion
tags: git, ci, workflow
---

# Git and CI Workflow

## Push Before Checking CI

Always push committed changes to the remote repository before waiting for or checking CI status.

Waiting for CI checks on unpushed local commits is backwards - the CI runs on the remote repository state, not local commits.

**Proper sequence:**
1. Commit locally
2. Run local checks (`yarn type-check:ci --force`, `yarn biome check --write .`)
3. Push to remote
4. Monitor CI status

## Branch Operations

When asked to move changes to a different branch, use git commands to commit existing changes to the specified branch rather than redoing the work. This is more efficient and prevents duplication of effort.

## Never Force Push

**Never force push to main or production branches** - under any circumstances.

## Working with tRPC Changes

When making changes that affect tRPC components or after pulling updates that modify tRPC-related files:

1. First run `yarn prisma generate` to ensure all database types are up-to-date
2. Then run `cd packages/trpc && yarn build` to rebuild the tRPC package

This sequence ensures that type definitions are properly generated before building.
