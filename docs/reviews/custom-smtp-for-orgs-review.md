# Code Review: `feat/custom_smtp_for_orgs`

## Overview

Custom SMTP configuration for organizations, allowing orgs to send booking/workflow emails through their own mail servers. The feature includes: Prisma model, encrypted credential storage (AES-256-GCM), DI wiring, tRPC endpoints, allowlist-gated email routing, and org admin UI.

---

## CRITICAL (3)

### 1. SSRF via unvalidated SMTP host

**Files:** `packages/trpc/server/routers/viewer/organizations/testSmtpConnection.handler.ts`, `createSmtpConfiguration.schema.ts:7`, `updateSmtpConfiguration.schema.ts:12`

`smtpHost` is validated only as `z.string().min(1)` with `stripCRLF`. An org admin can point it at `169.254.169.254`, `127.0.0.1`, or internal hostnames, using the Cal.com server as a network probe via `nodemailer`'s `transport.verify()`.

**Fix:** Add a Zod refinement rejecting RFC-1918, loopback, link-local IPs, and cloud metadata hostnames.

### 2. `organizationId` not guaranteed on `CalendarEvent` in `BookingEmailSmsHandler`

**File:** `packages/features/bookings/lib/BookingEmailSmsHandler.ts:127,290,328`

`BookingEmailSmsHandler` sends booking confirmation/reschedule/cancellation emails but never ensures `evt.organizationId` is populated. `_base-email.ts` gates custom SMTP on `this.organizationId` -- if it's `undefined`, custom SMTP is silently bypassed for the most common email paths.

**Fix:** Verify `CalendarEvent.organizationId` is set wherever `BookingEmailSmsHandler.send()` is called (e.g., in `handleNewBooking`).

### 3. Missing CRLF sanitization on `smtpUser` and `smtpPassword`

**Files:** `createSmtpConfiguration.schema.ts:9-10`, `updateSmtpConfiguration.schema.ts:22-23`

Every other string field applies `.transform(stripCRLF)` but credentials do not. CRLF in credentials can break the SMTP command sequence (SMTP injection).

**Fix:** Add `.transform(stripCRLF)` to both fields in both schemas.

---

## HIGH (6)

### 4. Both SMTP failures silently swallowed -- `sendEmail()` always resolves

**File:** `packages/emails/templates/_base-email.ts:198-211`

When both org SMTP and default SMTP fail, the error is logged but `sendEmail()` resolves successfully. Callers (workflow tasks, email manager) cannot detect failure. No retry is triggered. Emails are silently lost.

**Fix:** Throw/reject after both transports fail instead of resolving.

### 5. Truthy check on credentials silently skips encryption for empty string

**File:** `packages/features/ee/organizations/lib/service/SmtpConfigurationService.ts:181,186`

`if (params.smtpUser)` uses a truthy check while all other fields use `!== undefined`. Passing `smtpUser: ""` silently skips encryption, leaving stale encrypted credentials in place.

**Fix:** Use `!== undefined` and throw on empty string.

### 6. `OrganizerAddAttendeeEmail` missing from custom SMTP allowlist

**File:** `packages/emails/lib/custom-smtp-allowlist.ts`

All similar organizer emails are allowlisted, but `OrganizerAddAttendeeEmail` is absent. Add-attendee emails will bypass custom SMTP.

**Fix:** Add `"OrganizerAddAttendeeEmail"` to the allowlist.

### 7. Mandatory reminders derive `organizationId` from null `workflowStep`

**File:** `packages/features/ee/workflows/api/scheduleEmailReminders.ts:469-473`

For mandatory reminders, `workflowStep` is null by definition, so `organizationId` resolves to `null` and custom SMTP is bypassed.

**Fix:** Derive `organizationId` from the booking's org context for mandatory reminders.

### 8. No org-type guard in `SmtpConfigurationService.create`

**File:** `packages/features/ee/organizations/lib/service/SmtpConfigurationService.ts:77`

The service doesn't validate that `teamId` refers to an organization (`isOrganization: true`). The guard exists only at the tRPC layer. Any bypass of the router could create SMTP configs for non-org teams.

**Fix:** Add org-type validation in the service `create` method.

### 9. `findById` always fetches encrypted credentials even for ownership checks

**Files:** `SmtpConfigurationService.ts:103,119,203`, `SmtpConfigurationRepository.ts:67-72`

`delete` and `update` call `findById` which returns encrypted credentials, but only need `teamId` for authorization. Unnecessary credential exposure in memory.

**Fix:** Add a lightweight `findByIdForOwnership` selecting only `{ id, teamId }`.

---

## MEDIUM (5)

### 10. `@coss/ui` import -- likely wrong package

**File:** `apps/web/modules/ee/organizations/smtp-configuration/SmtpConfigurationsView.tsx:18`

All other imports use `@calcom/ui`. This may cause build failure.

**Fix:** Change to `@calcom/ui/components/collapsible`.

### 11. `getOrganizationId` helper duplicated across 6 handlers

**Files:** All SMTP tRPC handlers (`create`, `update`, `delete`, `get`, `list`, `testSmtpConnection`)

Identical 12-line function copy-pasted. DRY violation and maintenance risk.

**Fix:** Extract to shared `_utils.ts`.

### 12. `SMTP_CONFIGURATION_DI_TOKENS` not merged into central `DI_TOKENS`

**File:** `packages/features/di/tokens.ts`

Every other feature's tokens are spread into `DI_TOKENS`. SMTP tokens are not.

**Fix:** Add `...SMTP_CONFIGURATION_DI_TOKENS` to central registry.

### 13. `SmtpService.module.ts` uses manual `container.load()` instead of `bindModuleToClassOnToken`

**File:** `packages/features/di/smtpConfiguration/modules/SmtpService.module.ts:11-17`

Inconsistent with the other two modules and the project DI pattern.

### 14. Client/server schema mismatch on credential validation

**Files:** `SmtpConfigurationDialog.tsx:27-28` (client: `optional()`), `createSmtpConfiguration.schema.ts:9-10` (server: `min(1)`)

Form allows empty credentials client-side, server rejects -- user sees a confusing generic error instead of field-level validation.

---

## Positive Findings

- Credentials (`smtpUser`/`smtpPassword`) are **correctly never exposed** in API responses -- `toPublic()` strips them, and `smtpConfigurationSelectPublic` excludes them at the Prisma level
- Encryption is solid: AES-256-GCM with AAD binding to `teamId`, keyring-based key rotation via `decryptAndMaybeReencrypt`
- All endpoints gated behind `authedOrgAdminProcedure`
- Migration is safe and idempotent (CREATE TABLE + UNIQUE INDEX + FK)
- `sanitizeDisplayName` applied to `from` header construction
- No XSS vectors in UI components

---

## Recommended Priority

1. **Before merge:** Issues 1-3 (SSRF, missing organizationId flow, CRLF sanitization)
2. **Before merge:** Issues 4-6 (silent email loss, empty-string bug, missing allowlist entry)
3. **Should fix:** Issues 7-9 (mandatory reminder path, org guard, credential fetch)
4. **Nice to have:** Issues 10-14 (import typo, DRY, DI consistency, schema alignment)
