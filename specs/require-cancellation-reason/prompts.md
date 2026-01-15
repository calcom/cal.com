# Require Cancellation Reason Prompts

## Sync Implementation Status

Review what's been implemented for require-cancellation-reason and update specs/require-cancellation-reason/implementation.md

## Generate Tests

Write tests for the cancellationReason field. Follow existing test patterns in:
- apps/web/playwright/manage-booking-questions.e2e.ts (for rescheduleReason tests)
- packages/features/bookings/lib/handleCancelBooking/test/

## Code Review

Review changes for: type safety, error handling, security, edge cases

## Continue Feature

Continue working on require-cancellation-reason. Read specs/require-cancellation-reason/implementation.md for current status.

## Generate Docs with Screenshots

Generate documentation for require-cancellation-reason with screenshots:

1. Open the feature in the browser
2. Take screenshots of key UI states using the browser extension
3. Save screenshots to specs/require-cancellation-reason/docs/screenshots/
4. Create/update specs/require-cancellation-reason/docs/README.md with:
   - Feature overview
   - How to use (step-by-step with screenshots)
   - Configuration options
   - Common use cases

## Promote Docs to Public

Promote internal docs to public Mintlify docs:

1. Review specs/require-cancellation-reason/docs/README.md
2. Copy/adapt content to docs/require-cancellation-reason.mdx
3. Move screenshots to docs/images/require-cancellation-reason/
4. Update docs/mint.json navigation
5. Ensure customer-appropriate language (no internal details)
