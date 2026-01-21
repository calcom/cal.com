# Workflow Translation Implementation

## Status: complete

## Completed

- [x] Database schema: Added `WorkflowStepAutoTranslatedField` enum
- [x] Database schema: Added `WorkflowStepTranslation` model
- [x] Database schema: Added `autoTranslateEnabled`, `sourceLocale`, `translations` to WorkflowStep
- [x] Created WorkflowStepTranslationRepository
- [x] Created translateWorkflowStepData tasker task
- [x] Integrated translation lookup in EmailWorkflowService
- [x] Integrated translation lookup in smsReminderManager
- [x] Updated workflow update handler to trigger translation
- [x] Added UI toggle in WorkflowStepContainer
- [x] Added unit tests

## Files Changed

- `packages/prisma/schema.prisma`
- `packages/features/ee/workflows/repositories/WorkflowStepTranslationRepository.ts` (new)
- `packages/features/ee/workflows/repositories/WorkflowStepTranslationRepository.test.ts` (new)
- `packages/features/tasker/tasks/translateWorkflowStepData.ts` (new)
- `packages/features/tasker/tasks/translateWorkflowStepData.test.ts` (new)
- `packages/features/tasker/tasker.ts`
- `packages/features/tasker/tasks/index.ts`
- `packages/features/ee/workflows/lib/service/EmailWorkflowService.ts`
- `packages/features/ee/workflows/lib/reminders/smsReminderManager.ts`
- `packages/trpc/server/routers/viewer/workflows/update.schema.ts`
- `packages/trpc/server/routers/viewer/workflows/update.handler.ts`
- `apps/web/modules/ee/workflows/components/WorkflowStepContainer.tsx`
- `apps/web/public/static/locales/en/common.json`

## Verification

- [ ] Run `yarn workspace @calcom/prisma db-migrate`
- [ ] Run `yarn prisma generate`
- [ ] Run `yarn type-check:ci --force`
