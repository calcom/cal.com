# Workflow Translation Implementation

## Status: in-progress

## Completed

- [x] Database schema: Added `WorkflowStepAutoTranslatedField` enum
- [x] Database schema: Added `WorkflowStepTranslation` model
- [x] Database schema: Added `autoTranslateEnabled`, `sourceLocale`, `translations` to WorkflowStep

## In Progress

- WorkflowStepTranslationRepository

## Blocked

## Next Steps

1. Create WorkflowStepTranslationRepository
2. Create translateWorkflowStepData tasker task
3. Integrate translation lookup in EmailWorkflowService
4. Integrate translation lookup in smsReminderManager
5. Update workflow update handler to trigger translation
6. Add UI toggle in WorkflowStepContainer

## Session Notes

### 2025-01-21
- Added schema changes to packages/prisma/schema.prisma
