# Organization Custom SMTP Integration

## Overview

This feature allows organizations to send booking notifications and workflow emails from their own SMTP server with a custom "from" address. When enabled, emails are sent through the organization's configured SMTP server instead of Cal.com's default email infrastructure.

## Architecture

### High-Level Flow

```
User books meeting
       ↓
CalendarEventBuilder extracts organizationId from user.profiles
       ↓
CalendarEvent.organizationId is set
       ↓
Email class receives organizationId
       ↓
BaseEmail.canUseCustomSmtp() checks allowlist + organizationId
       ↓
If allowed → fetch org SMTP config → send via org SMTP
       ↓
If org SMTP fails → fallback to default SMTP
```

---

## OrganizationId Flow for Different Email Types

### 1. Booking Emails (Attendee & Organizer)

**Source:** `CalendarEventBuilder.fromBooking()`

**Flow:**
```
packages/features/CalendarEventBuilder.ts:127
↓
organizationId = user.profiles?.[0]?.organizationId ?? null
↓
builder.withOrganization(organizationId) at line 192
↓
CalendarEvent.organizationId is set
↓
Email classes receive it via constructor
```

**Email Classes:**
- `AttendeeScheduledEmail`, `AttendeeRescheduledEmail`, `AttendeeCancelledEmail`, etc.
- `OrganizerScheduledEmail`, `OrganizerRescheduledEmail`, `OrganizerCancelledEmail`, etc.

**How organizationId reaches the email:**
```typescript
// In email templates like attendee-scheduled-email.ts
constructor(calEvent: CalendarEvent, ...) {
  super(calEvent, ...);
  this.organizationId = calEvent.organizationId;  // Set from BaseEmail
}
```

### 2. Workflow Emails

**Source:** `WorkflowService.generateCommonScheduleFunctionParams()`

**Flow:**
```
packages/features/ee/workflows/lib/service/WorkflowService.ts:355-358
↓
Two sources for organizationId:
  1. workflowOrganizationId = workflow.team?.isOrganization
       ? workflow.teamId
       : workflow.team?.parentId ?? null
  2. evtOrganizationId (fallback from CalendarEvent)
↓
organizationId = workflowOrganizationId ?? evtOrganizationId ?? null
↓
Passed to EmailWorkflowService.handleSendEmailWorkflowTask()
↓
sendCustomWorkflowEmail() with organizationId
```

**Key File:** `packages/features/ee/workflows/lib/service/EmailWorkflowService.ts`

```typescript
// Line 73-76: Derives organizationId
const workflowOrganizationId = workflow.team?.isOrganization
  ? workflow.teamId
  : workflow.team?.parentId ?? null;
const organizationId = workflowOrganizationId ?? evt.organizationId ?? null;
```

**Priority Order:**
1. Workflow's team organizationId (if team is an organization)
2. Workflow's team's parent organization ID
3. CalendarEvent's organizationId (fallback from booking)

### 3. Recording/Transcript Download Emails

**Source:** Same as booking emails via `CalendarEventBuilder`

**Email Classes:**
- `AttendeeDailyVideoDownloadRecordingEmail`
- `AttendeeDailyVideoDownloadTranscriptEmail`
- `OrganizerDailyVideoDownloadRecordingEmail`
- `OrganizerDailyVideoDownloadTranscriptEmail`

**How organizationId is set:**
```typescript
// These emails receive CalendarEvent in constructor
constructor(calEvent: CalendarEvent, ...) {
  super(calEvent, ...);
  this.organizationId = calEvent.organizationId;
}
```

### 4. Routing Forms Response Emails

**Source:** `formSubmissionUtils.ts`

**Flow:**
```
packages/app-store/routing-forms/lib/formSubmissionUtils.ts
↓
sendResponseEmail(form, orderedResponses, toAddresses, organizationId)
↓
ResponseEmail constructor receives organizationId
↓
this.organizationId = organizationId
```

**Email Class:** `ResponseEmail`

**Key File:** `packages/app-store/routing-forms/emails/templates/response-email.ts`

```typescript
constructor({ form, toAddresses, orderedResponses, organizationId }) {
  super();
  this.form = form;
  this.orderedResponses = orderedResponses;
  this.toAddresses = toAddresses;
  this.organizationId = organizationId;
}
```

### 5. Broken Integration Emails

**Source:** Same as booking emails via `CalendarEvent`

**Email Class:** `BrokenIntegrationEmail`

**How organizationId is set:**
```typescript
// packages/emails/templates/broken-integration-email.ts
constructor(calEvent: CalendarEvent, ...) {
  super();
  this.calEvent = calEvent;
  this.organizationId = calEvent.organizationId;
}
```

---

## Email Allowlist

Only certain email types are allowed to use custom SMTP. This is controlled by:

**File:** `packages/emails/lib/custom-smtp-allowlist.ts`

```typescript
export const CUSTOM_SMTP_ALLOWED_EMAILS = [
  // Broken integration emails
  "BrokenIntegrationEmail",

  // Attendee booking emails
  "AttendeeAddGuestsEmail",
  "AttendeeAwaitingPaymentEmail",
  "AttendeeCancelledEmail",
  "AttendeeCancelledSeatEmail",
  "AttendeeDeclinedEmail",
  "AttendeeLocationChangeEmail",
  "AttendeeRequestEmail",
  "AttendeeRescheduledEmail",
  "AttendeeScheduledEmail",
  "AttendeeUpdatedEmail",
  "AttendeeWasRequestedToRescheduleEmail",

  // Attendee recording/transcript emails
  "AttendeeDailyVideoDownloadRecordingEmail",
  "AttendeeDailyVideoDownloadTranscriptEmail",

  // Organizer booking emails
  "OrganizerAddGuestsEmail",
  "OrganizerAttendeeCancelledSeatEmail",
  "OrganizerCancelledEmail",
  "OrganizerLocationChangeEmail",
  "OrganizerPaymentRefundFailedEmail",
  "OrganizerReassignedEmail",
  "OrganizerRequestEmail",
  "OrganizerRequestReminderEmail",
  "OrganizerRequestedToRescheduleEmail",
  "OrganizerRescheduledEmail",
  "OrganizerScheduledEmail",

  // Organizer recording/transcript emails
  "OrganizerDailyVideoDownloadRecordingEmail",
  "OrganizerDailyVideoDownloadTranscriptEmail",

  // Payment emails
  "NoShowFeeChargedEmail",

  // Workflow emails
  "WorkflowEmail",

  // Routing forms emails
  "ResponseEmail",
] as const;

export type CustomSmtpAllowedEmail = (typeof CUSTOM_SMTP_ALLOWED_EMAILS)[number];
```

---

## BaseEmail Custom SMTP Logic

**File:** `packages/emails/templates/_base-email.ts`

### canUseCustomSmtp()
```typescript
private canUseCustomSmtp(): boolean {
  const className = this.constructor.name;
  return (
    (CUSTOM_SMTP_ALLOWED_EMAILS as readonly string[]).includes(className) &&
    !!this.organizationId
  );
}
```

### Fallback Mechanism

When org SMTP fails, the system automatically retries with default SMTP:

```typescript
try {
  await sendWithTransport(transport, finalFrom);
} catch (orgSmtpError) {
  if (usingOrgSmtp) {
    log.warn("Org SMTP failed, retrying with default SMTP", { ... });
    try {
      await sendWithTransport(defaultOptions.transport, sanitizedFrom);
      log.info("Successfully sent email using default SMTP after org SMTP failure");
    } catch (defaultSmtpError) {
      console.error("sendEmail failed with both org and default SMTP", ...);
    }
  } else {
    console.error("sendEmail", ...);
  }
}
```

---

## Database Schema

**File:** `packages/prisma/schema.prisma`

```prisma
model SmtpConfiguration {
  id             Int  @id @default(autoincrement())
  organizationId Int
  organization   Team @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  fromEmail String
  fromName  String

  smtpHost     String
  smtpPort     Int
  smtpUser     String  @db.Text
  smtpPassword String  @db.Text
  smtpSecure   Boolean @default(true)

  lastTestedAt DateTime?
  lastError    String?

  isEnabled Boolean @default(true)
  isPrimary Boolean @default(false)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([organizationId, fromEmail])
  @@index([organizationId])
}
```

**Key Points:**
- `fromName` is required (not nullable)
- `smtpUser` and `smtpPassword` are encrypted using AES256
- `isPrimary` indicates which config is used for sending
- `isEnabled` allows disabling without deletion

---

## Service Layer

### SmtpConfigurationService

**File:** `packages/features/ee/organizations/lib/service/SmtpConfigurationService.ts`

**Key Methods:**
- `create(params)` - Create new SMTP configuration
- `getActiveConfigForOrg(orgId)` - Get primary active config for org
- `setAsPrimary(id, orgId)` - Set a config as primary
- `toggle(id, orgId)` - Enable/disable a config
- `delete(id, orgId)` - Delete a config
- `testConnection(params)` - Test SMTP connection before saving

### SmtpService

**File:** `packages/features/ee/organizations/lib/service/SmtpService.ts`

Handles actual SMTP connection testing and test email sending.

### SmtpConfigurationRepository

**File:** `packages/features/ee/organizations/repositories/SmtpConfigurationRepository.ts`

Database operations for SMTP configurations.

---

## tRPC API Routes

**File:** `packages/trpc/server/routers/viewer/organizations/_router.tsx`

| Route | Description |
|-------|-------------|
| `listSmtpConfigurations` | List all SMTP configs for org |
| `getSmtpConfiguration` | Get single config by ID |
| `createSmtpConfiguration` | Create new config (requires connection test first) |
| `deleteSmtpConfiguration` | Delete config by ID |
| `setSmtpConfigurationAsPrimary` | Set config as primary |
| `toggleSmtpConfiguration` | Enable/disable config |
| `testSmtpConnection` | Test SMTP connection |

All routes require `authedOrgAdminProcedure` (org admin permissions).

---

## UI Components

**Settings Page:** `/settings/organizations/smtp-configurations`

**Files:**
- `apps/web/app/.../organizations/(org-admin-only)/smtp-configurations/page.tsx`
- `apps/web/modules/ee/organizations/smtp-configurations/SmtpConfigurationsView.tsx`
- `apps/web/modules/ee/organizations/smtp-configurations/AddSmtpConfigurationDialog.tsx`

**User Flow:**
1. Org admin navigates to Settings → Organization → SMTP Configurations
2. Clicks "Add SMTP Configuration"
3. Enters SMTP details (host, port, username, password, secure mode)
4. Clicks "Test Connection" to verify credentials
5. If test passes, enters "from" email and name
6. Clicks "Create" to save configuration
7. New config becomes primary automatically if it's the first one
8. Can manage multiple configs, set primary, enable/disable

---

## Files Changed Summary

### New Files Created

| File | Purpose |
|------|---------|
| `packages/emails/lib/custom-smtp-allowlist.ts` | Allowlist of emails that can use custom SMTP |
| `packages/features/di/smtpConfiguration/` | Dependency injection container for SMTP services |
| `packages/features/ee/organizations/lib/service/SmtpConfigurationService.ts` | Business logic for SMTP config management |
| `packages/features/ee/organizations/lib/service/SmtpService.ts` | SMTP connection testing and sending |
| `packages/features/ee/organizations/repositories/SmtpConfigurationRepository.ts` | Database operations |
| `packages/prisma/migrations/20260116140541_add_smtp_configuration_for_custom_workflow_emails/` | Database migration |
| `packages/trpc/server/routers/viewer/organizations/createSmtpConfiguration.*` | tRPC create handler |
| `packages/trpc/server/routers/viewer/organizations/deleteSmtpConfiguration.*` | tRPC delete handler |
| `packages/trpc/server/routers/viewer/organizations/getSmtpConfiguration.*` | tRPC get handler |
| `packages/trpc/server/routers/viewer/organizations/listSmtpConfigurations.handler.ts` | tRPC list handler |
| `packages/trpc/server/routers/viewer/organizations/setSmtpConfigurationAsPrimary.*` | tRPC set primary handler |
| `packages/trpc/server/routers/viewer/organizations/testSmtpConnection.*` | tRPC test connection handler |
| `packages/trpc/server/routers/viewer/organizations/toggleSmtpConfiguration.*` | tRPC toggle handler |
| `apps/web/app/.../smtp-configurations/page.tsx` | Settings page |
| `apps/web/modules/ee/organizations/smtp-configurations/SmtpConfigurationsView.tsx` | Main view component |
| `apps/web/modules/ee/organizations/smtp-configurations/AddSmtpConfigurationDialog.tsx` | Add config dialog |

### Modified Files

#### Core Email Infrastructure

| File | Changes |
|------|---------|
| `packages/prisma/schema.prisma` | Added `SmtpConfiguration` model |
| `packages/emails/templates/_base-email.ts` | Added custom SMTP support with fallback |
| `packages/emails/templates/workflow-email.ts` | Added organizationId support |
| `packages/emails/templates/attendee-scheduled-email.ts` | Added organizationId support |
| `packages/emails/templates/organizer-scheduled-email.ts` | Added organizationId support |
| `packages/emails/templates/*-daily-video-download-*.ts` | Added organizationId support |
| `packages/emails/templates/broken-integration-email.ts` | Added organizationId support |

#### Routing Forms

| File | Changes |
|------|---------|
| `packages/app-store/routing-forms/emails/templates/response-email.ts` | Added organizationId to constructor |
| `packages/app-store/routing-forms/lib/formSubmissionUtils.ts` | Pass organizationId to sendResponseEmail() |

#### Workflow System

| File | Changes |
|------|---------|
| `packages/features/ee/workflows/lib/service/WorkflowService.ts` | Added organizationId derivation |
| `packages/features/ee/workflows/lib/service/EmailWorkflowService.ts` | Pass organizationId through workflow chain |
| `packages/features/ee/workflows/lib/types.ts` | Added organizationId to types |
| `packages/features/ee/workflows/api/scheduleEmailReminders.ts` | Added organizationId derivation and passing |
| `packages/features/ee/workflows/lib/getAllWorkflows.ts` | Added team.isOrganization and team.parentId to select |
| `packages/features/ee/workflows/lib/getWorkflowReminders.ts` | Added parentId to type and select |
| `packages/features/ee/workflows/lib/reminders/emailReminderManager.ts` | Added organizationId parameter |
| `packages/features/ee/workflows/lib/reminders/messageDispatcher.ts` | Added organizationId to fallback email data |
| `packages/features/ee/workflows/lib/reminders/providers/emailProvider.ts` | Added organizationId passing |
| `packages/features/ee/workflows/lib/reminders/reminderScheduler.ts` | Added organizationId derivation and passing |
| `packages/features/ee/workflows/lib/reminders/smsReminderManager.ts` | Added organizationId parameter |
| `packages/features/ee/workflows/lib/reminders/whatsappReminderManager.ts` | Added organizationId parameter |
| `packages/features/ee/workflows/lib/scheduleBookingReminders.ts` | Pass evtOrganizationId through |
| `packages/features/ee/workflows/lib/scheduleWorkflowNotifications.ts` | Pass evtOrganizationId through |
| `packages/features/tasker/tasks/sendWorkflowEmails.ts` | Pass organizationId to workflow emails |

#### UI and API

| File | Changes |
|------|---------|
| `packages/trpc/server/routers/viewer/organizations/_router.tsx` | Added SMTP routes |
| `apps/web/.../SettingsLayoutAppDirClient.tsx` | Added SMTP settings nav item |
| `apps/web/public/static/locales/en/common.json` | Added translations |

#### Test Infrastructure

| File | Changes |
|------|---------|
| `packages/lib/testEmails.ts` | Added `TestEmailSmtpConfig` and `TestEmail` interfaces with smtpConfig field |
| `packages/testing/src/lib/bookingScenario/bookingScenario.ts` | Added `createSmtpConfiguration()` helper, `withSmtpConfig` option for `createOrganization()` |
| `packages/testing/src/lib/bookingScenario/expects.ts` | Added `expectEmailSentViaCustomSmtp()`, `expectEmailSentViaDefaultSmtp()`, `expectEmailSmtpConfig()` helpers |

---

## Security Considerations

1. **Encrypted Credentials:** SMTP passwords are encrypted using AES256 (`symmetricEncrypt`/`symmetricDecrypt`)
2. **Org Admin Only:** All SMTP management endpoints require org admin permissions
3. **No Password Exposure:** Passwords are never returned in API responses
4. **Connection Test Required:** SMTP configs can only be created after successful connection test
5. **Fallback Protection:** If org SMTP fails, emails still get sent via default SMTP

---

## Testing the Feature

### Manual Testing

1. Create an organization in Cal.com
2. Navigate to Settings → Organization → SMTP Configurations
3. Add a new SMTP configuration with valid credentials
4. Test the connection
5. Save the configuration
6. Create a booking for an event owned by the organization
7. Verify emails are sent from the custom "from" address

**Logs to check:**
- `[BaseEmail] Using custom SMTP config` - When org SMTP is used
- `[BaseEmail] Org SMTP failed, retrying with default SMTP` - When fallback occurs

### Integration Tests

Use the test helpers for integration testing:

```typescript
import {
  createOrganization,
  createSmtpConfiguration,
} from "@calcom/testing/lib/bookingScenario/bookingScenario";
import {
  expectEmailSentViaCustomSmtp,
  expectEmailSentViaDefaultSmtp,
} from "@calcom/testing/lib/bookingScenario/expects";

// Create org with SMTP config
const org = await createOrganization({
  name: "Test Org",
  slug: "test-org",
  withSmtpConfig: {
    fromEmail: "noreply@test-org.com",
    fromName: "Test Org",
  },
});

// Or create SMTP config separately
await createSmtpConfiguration({
  organizationId: org.id,
  fromEmail: "noreply@test-org.com",
  fromName: "Test Org",
});

// Verify email was sent via custom SMTP
expectEmailSentViaCustomSmtp({
  emails,
  to: "attendee@example.com",
  expectedFromEmail: "noreply@test-org.com",
});
```
