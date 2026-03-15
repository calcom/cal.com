---
title: Workflow Trigger Implementation
impact: MEDIUM
impactDescription: Consistent workflow patterns ensure reliable automation
tags: workflows, triggers, automation
---

# Workflow Trigger Implementation

## Using scheduleWorkflowReminders

To trigger workflows in Cal.com, use the `scheduleWorkflowReminders` function. This is the standard approach used throughout the codebase.

Before implementing new workflow triggers, examine existing implementations in the codebase to understand the pattern. The function:
- Filters workflows by trigger type
- Processes each workflow step

Key locations where this is used:
- Booking handlers
- Confirmation processes
- Other booking-related events

## Adding New Workflow Triggers

1. Check `packages/prisma/schema.prisma` for existing webhooks and workflow trigger enums as reference
2. Add the same enums to workflows (only when asked specifically)
3. Add enums to `packages/features/ee/workflows/lib/constants.ts` for UI display
4. Add translations to `en/locale.json` using the format `{enum}_trigger` (all lowercase)

Webhook triggers serve as the reference implementation pattern for workflow triggers.

## Workflows vs Webhooks

Workflows and webhooks are two completely separate features in Cal.com with different implementations and file structures:

- Workflow constants: `packages/features/ee/workflows/lib/constants.ts`
- NOT in the webhooks directory

When working on workflow triggers, do not reference or use webhook trigger implementations - they are distinct systems.
