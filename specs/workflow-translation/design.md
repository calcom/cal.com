# Workflow Translation Design

## Overview

Translate workflow `reminderBody` and `emailSubject` to the visitor's browser language using lingo.dev. Follows the existing pattern for event type title/description translation.

## Problem Statement

Workflow notifications are sent in the language they were written, not the attendee's language. Organizations need attendees to receive notifications in their preferred language.

## User Stories

- As an org admin, I want workflow notifications translated to the attendee's language so international attendees understand the message
- As an attendee, I want to receive booking notifications in my browser language

## Technical Design

### Database Changes

Add to `schema.prisma`:

```prisma
enum WorkflowStepAutoTranslatedField {
  REMINDER_BODY
  EMAIL_SUBJECT
}

model WorkflowStepTranslation {
  uid            String   @id @default(cuid())
  workflowStep   WorkflowStep @relation(fields: [workflowStepId], references: [id], onDelete: Cascade)
  workflowStepId Int
  field          WorkflowStepAutoTranslatedField
  sourceLocale   String
  targetLocale   String
  translatedText String   @db.Text
  sourceHash     String
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@unique([workflowStepId, field, targetLocale])
  @@index([workflowStepId, field, targetLocale])
}
```

Add to WorkflowStep:
- `autoTranslateEnabled: Boolean @default(false)`
- `sourceLocale: String?`
- `translations: WorkflowStepTranslation[]`

### API Changes

**Workflow update handler** (`packages/trpc/server/routers/viewer/workflows/update.handler.ts`):
- Accept `autoTranslateEnabled` and `sourceLocale` fields
- Trigger `translateWorkflowStepData` tasker task when content changes

**New tasker task** (`packages/features/tasker/tasks/translateWorkflowStepData.ts`):

- Uses `TranslationService` to translate body/subject to 19 target locales
- Store translations in `WorkflowStepTranslation` table via repository

### TranslationService

Shared service at `packages/features/translation/services/TranslationService.ts`:

- `translateText()` - Translates text to all supported locales using LingoDotDevService
- `getWorkflowStepTranslations()` - Looks up cached translations for workflow steps
- `getEventTypeTranslations()` - Looks up cached translations for event types
- Uses DI pattern with repositories injected via constructor

### Send-Time Integration

**EmailWorkflowService** (`generateEmailPayloadForEvtWorkflow`):

- Uses `TranslationService.getWorkflowStepTranslations()` to lookup translation
- Fallback to original text if no translation found

**smsReminderManager** / **whatsappReminderManager**:

- Same pattern: uses TranslationService for attendee locale lookup

### UI Changes

**WorkflowStepContainer.tsx**:
- Add "Auto-translate for attendees" toggle
- Only show for org users and attendee-targeted actions

## Supported Locales

19 locales (same as event types):
en, es, de, pt, pt-BR, fr, it, ar, ru, zh-CN, zh-TW, ko, ja, nl, sv, da, is, lt, nb

## Scope

**Supported actions**: EMAIL_ATTENDEE, SMS_ATTENDEE, WHATSAPP_ATTENDEE

**Not supported**: EMAIL_HOST, EMAIL_ADDRESS, SMS_NUMBER (no attendee locale available)

## Out of Scope

- Form-based workflows (FORM_SUBMITTED triggers)
- CAL_AI_PHONE_CALL action
- Translation of default templates (already use i18n)
