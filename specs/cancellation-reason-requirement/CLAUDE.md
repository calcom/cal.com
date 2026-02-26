# CLAUDE.md — Cancellation Reason Requirement

## Project Context

A setting in Event Type Advanced settings to configure when cancellation reasons are required (mandatory for both, host only, attendee only, or optional).

## Before Starting Work

1. Read specs/cancellation-reason-requirement/design.md
2. Check specs/cancellation-reason-requirement/implementation.md for current progress
3. Look at existing patterns in apps/web/modules/event-types/components/tabs/advanced/

## Code Patterns

- Follow RequiresConfirmationController pattern for settings UI
- Use metadata schema in packages/prisma/zod-utils.ts
- Follow existing translation patterns

## Don't

- Don't add features not in design.md
- Don't skip tests
- Don't modify reschedule reason behavior (out of scope)
