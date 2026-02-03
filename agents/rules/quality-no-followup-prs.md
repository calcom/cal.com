---
title: Minimize Follow-up PRs for Small Refactors
impact: HIGH
impactDescription: Prevents technical debt accumulation
tags: quality, pr, refactoring, technical-debt
---

## Minimize Follow-up PRs for Small Refactors

**Impact: HIGH**

Follow-up PRs for minor improvements rarely materialize. Instead, they accumulate as technical debt that burdens us months or years later. If a small refactor can be done now, do it now.

**Incorrect:**

```typescript
// PR comment: "I'll fix this naming in a follow-up PR"
const d = getUserData(); // Bad variable name
const r = processData(d); // Another bad name

// The follow-up PR never happens, and now we have unclear code
```

**Correct:**

```typescript
// Fix it in the same PR
const userData = getUserData();
const processedResult = processData(userData);
```

**When follow-ups are acceptable:**
- Substantial changes that genuinely warrant separate PRs
- Exceptional, urgent cases where the current PR must ship immediately
- Changes that require additional review from different stakeholders

**The principle:**
The "slowness" of doing things right is an investment, not a cost. Code that's architected correctly from the start doesn't need massive refactors later.

Reference: [Cal.com Engineering Blog](https://cal.com/blog/engineering-in-2026-and-beyond)
