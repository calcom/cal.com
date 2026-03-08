# Workflow Translation Implementation

## Status: complete

## Completed

- [x] Database schema: Added `WorkflowStepAutoTranslatedField` enum
- [x] Database schema: Added `WorkflowStepTranslation` model
- [x] Database schema: Added `autoTranslateEnabled`, `sourceLocale`, `translations` to WorkflowStep
- [x] Created WorkflowStepTranslationRepository (with DI/Prisma constructor injection)
- [x] Created translateWorkflowStepData tasker task
- [x] Integrated translation lookup in EmailWorkflowService
- [x] Integrated translation lookup in smsReminderManager
- [x] Integrated translation lookup in whatsappReminderManager
- [x] Updated workflow update handler to trigger translation
- [x] Added UI toggle in WorkflowStepContainer
- [x] Added unit tests
- [x] Created shared TranslationService with DI

## Files Changed

### New Files

- `packages/features/translation/services/TranslationService.ts` - Shared translation service
- `packages/features/translation/services/ITranslationService.ts` - Interface
- `packages/features/translation/di/tokens.ts` - DI tokens
- `packages/features/di/modules/TranslationService.ts` - DI module
- `packages/features/di/containers/TranslationService.ts` - DI container
- `packages/features/ee/workflows/repositories/WorkflowStepTranslationRepository.ts`
- `packages/features/ee/workflows/di/WorkflowStepTranslationRepository.module.ts` - DI module
- `packages/features/ee/workflows/di/WorkflowStepTranslationRepository.container.ts` - DI container
- `packages/features/tasker/tasks/translateWorkflowStepData.ts`
- `packages/features/tasker/tasks/translateWorkflowStepData.test.ts`

### Modified Files

- `packages/prisma/schema.prisma` - Added WorkflowStepTranslation model and WorkflowStep fields
- `packages/features/tasker/tasker.ts` - Register translateWorkflowStepData task
- `packages/features/tasker/tasks/index.ts` - Export translateWorkflowStepData
- `packages/features/ee/workflows/lib/service/EmailWorkflowService.ts` - Translation lookup at send time
- `packages/features/ee/workflows/lib/service/EmailWorkflowService.test.ts` - Auto translation tests
- `packages/features/ee/workflows/lib/reminders/smsReminderManager.ts` - Translation lookup
- `packages/features/ee/workflows/lib/reminders/emailReminderManager.ts` - Pass autoTranslateEnabled/sourceLocale
- `packages/features/ee/workflows/lib/scheduleBookingReminders.ts` - Pass fields to scheduleEmailReminder
- `packages/features/ee/workflows/lib/types.ts` - Added autoTranslateEnabled/sourceLocale to WorkflowStep type
- `packages/features/ee/workflows/lib/getAllWorkflows.ts` - Added fields to workflowSelect
- `packages/features/ee/workflows/lib/schema.ts` - Added fields to formSchema
- `packages/features/ee/workflows/lib/test/workflows.test.ts` - Added fields to test select
- `packages/features/ee/workflows/repositories/WorkflowReminderRepository.ts` - Added fields to findByIdIncludeStepAndWorkflow
- `packages/trpc/server/routers/viewer/workflows/update.schema.ts` - Added fields to step schema
- `packages/trpc/server/routers/viewer/workflows/update.handler.ts` - Org-only enforcement, trigger translation task
- `apps/web/modules/ee/workflows/components/WorkflowStepContainer.tsx` - UI toggle
- `apps/web/public/static/locales/en/common.json` - Translation strings

## Verification

- [ ] Run `yarn workspace @calcom/prisma db-migrate`
- [ ] Run `yarn prisma generate`
- [ ] Run `yarn type-check:ci --force`
