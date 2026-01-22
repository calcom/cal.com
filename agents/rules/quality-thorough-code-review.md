---
title: Address All Nits Before Merging
impact: HIGH
impactDescription: Prevents codebase degradation over time
tags: quality, code-review, standards
---

## Address All Nits Before Merging

**Impact: HIGH**

Don't let PRs through with a lot of nits just to avoid being "the bad person." This is precisely how codebases become sloppy over time. Code review is not about being nice. It's about maintaining the quality standards our infrastructure demands.

**Incorrect approach:**

```
Reviewer: "This variable name could be clearer, but it's fine I guess"
Reviewer: "We usually use early returns here, but this works"
Reviewer: "Approved with minor suggestions"
// PR merged with multiple small issues
```

**Correct approach:**

```
Reviewer: "Please rename `d` to `userData` for clarity"
Reviewer: "Please refactor to use early returns per our standards"
Reviewer: "Requesting changes - please address before merging"
// PR updated to meet all standards before merge
```

**The principle:**
Every nitpick matters. Every pattern violation matters. Address them before merging, not after. We hold each other accountable for quality because cutting corners might feel faster in the moment, but it creates problems that slow everyone down later.

**Make it normal to challenge poor decisions, respectfully:**
- If someone says "let's just hard-code this for now," ask "what would it take to do it the proper way the first time?"
- If someone wants to commit untested code, push back
- If someone suggests copying and pasting instead of creating a proper abstraction, call it out respectfully

Reference: [Cal.com Engineering Blog](https://cal.com/blog/engineering-in-2026-and-beyond)
