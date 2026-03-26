---
title: Code Review Focus
impact: MEDIUM
impactDescription: Focused reviews are more useful than scattered feedback
tags: code-review, workflow
---

# Code Review Focus

## When Asked to Review a PR

Focus on providing a clear summary of what the PR is doing and its core functionality.

**Avoid getting sidetracked by:**
- CI failures
- Testing issues
- Technical implementation details (unless specifically requested)

## Good Review Structure

1. **Summary**: What does this PR do?
2. **Core changes**: What are the main code changes?
3. **Impact**: What parts of the system does this affect?

## What to Look For

- Does the code do what it claims to do?
- Are there any obvious bugs or edge cases?
- Does it follow Cal.com coding standards?
- Is the change appropriately scoped?

## What to Skip (Unless Asked)

- Nitpicks about style (Biome handles this)
- Suggestions for refactoring unrelated code
- Deep dives into implementation details
