---
title: Workflow Trigger Implementation
impact: MEDIUM
tags: workflows, triggers, scheduling
---

## Workflow Trigger Implementation

**Impact: MEDIUM**

To trigger workflows in Cal.com, use the `scheduleWorkflowReminders` function. This is the standard approach used throughout the codebase.

**Key function:**

```typescript
import { scheduleWorkflowReminders } from "@calcom/features/ee/workflows/lib/reminders/scheduleWorkflowReminders";
```

**Usage locations:**

- Booking handlers
- Confirmation processes
- Booking-related events

The function filters workflows by trigger type and processes each workflow step.

**Adding new workflow triggers:**

1. Check `packages/prisma/schema.prisma` for existing webhook and workflow trigger enums
2. Add the same enums to workflows (only when specifically asked)
3. Add enums to `packages/features/ee/workflows/lib/constants.ts` for UI display
4. Add translations to `en/locale.json` using format `{enum}_trigger` (all lowercase)

**Workflows vs Webhooks - Important distinction:**

Workflows and webhooks are **completely separate features** with different implementations and file structures:

- **Workflow constants**: `packages/features/ee/workflows/lib/constants.ts`
- **Webhook triggers**: Different directory and implementation

When working on workflow triggers, do NOT reference or use webhook trigger implementations - they are distinct systems that should not be confused or mixed.

**Before implementing:**

Examine existing implementations in the codebase to understand the pattern. The `scheduleWorkflowReminders` function is the canonical way to trigger workflows.
