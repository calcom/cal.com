# CLAUDE.md — Workflow Translation

## Project Context

Add auto-translation for workflow body and subject using lingo.dev, matching the existing event type translation pattern.

## Before Starting Work

1. Read specs/workflow-translation/design.md
2. Check specs/workflow-translation/implementation.md for current progress
3. Study existing patterns in:
   - `packages/features/tasker/tasks/translateEventTypeData.ts`
   - `packages/features/eventTypeTranslation/repositories/EventTypeTranslationRepository.ts`
   - `packages/lib/server/service/lingoDotDev.ts`

## Code Patterns

**Repository pattern**: Follow `EventTypeTranslationRepository` for DB operations

**Tasker pattern**: Follow `translateEventTypeData.ts` for async translation task

**Translation lookup**: In email/SMS services, lookup translation before `customTemplate()` call

## Reference Files

| Purpose | File |
|---------|------|
| Lingo.dev service | `packages/lib/server/service/lingoDotDev.ts` |
| Event type translation task | `packages/features/tasker/tasks/translateEventTypeData.ts` |
| Event type translation repo | `packages/features/eventTypeTranslation/repositories/EventTypeTranslationRepository.ts` |
| Email workflow service | `packages/features/ee/workflows/lib/service/EmailWorkflowService.ts` |
| SMS manager | `packages/features/ee/workflows/lib/reminders/smsReminderManager.ts` |
| Workflow update handler | `packages/trpc/server/routers/viewer/workflows/update.handler.ts` |

## Don't

- Don't translate default templates (REMINDER, RATING) - they use i18n
- Don't support non-attendee actions (no locale available)
- Don't add features not in design.md
- Don't skip updating implementation.md after each piece
