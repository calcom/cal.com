# CLAUDE.md — Booker Reputation Score

## Project Context

A per-booking reputation/confidence score shown to the host (logged-in account user) on the bookings list, reflecting the *booker's* (primary attendee's) historical no-show track record. Score is derived on-the-fly from existing `Attendee.noShow` data, displayed as a numeric 0-100 score with a colored badge indicating reliability band. A separate suspicious-email badge is added in a later milestone.

## Before Starting Work

1. Read specs/booker-reputation/design.md
2. Check specs/booker-reputation/implementation.md for current progress
3. Look at existing patterns in:
   - `apps/web/components/booking/BookingListItem.tsx` (single-cell booking card render)
   - `apps/web/modules/bookings/hooks/useBookingListColumns.tsx` (column definitions)
   - `apps/web/modules/bookings/components/BookingListContainer.tsx` (table wiring, resolver consumer)
   - `packages/features/bookings/repositories/AttendeeRepository.ts` (`Attendee.noShow` read/write paths)
   - `packages/features/bookings/lib/getLuckyUser.ts` (`includeNoShowInRRCalculation` reference usage)
   - The tRPC `viewer.bookings.get` resolver and `BookingsGetOutput` Zod schema

## Code Patterns

- New score logic lives in `packages/lib/bookerReputation/` sibling to existing `packages/lib/bookings/`, `packages/lib/schedules/`, etc.
- Use `@calcom/lib/unstable_cache` for per-email score caching (~60s TTL)
- Reuse `@calcom/ui/components/badge` `Badge` component (variants: gray/green/orange/red) and the existing assignment-reason badge styling in `BookingListItem.tsx`
- Reuse `useLocale` / `t()` for all user-facing strings; add English keys, other locales fall back via `i18n.lock`
- Single batched grouped Prisma/raw-SQL query per bookings page, keyed by the set of `attendees[0].email` on the page
- Keep each PR to ≤5-7 files / ≤500 lines per the spec workflow rule

## Don't

- Don't add features not in design.md (no persistence, no smoothing, no per-attendee display, no server-side sort/filter by score — all deferred to future-work.md)
- Don't add a Prisma migration in M1/M2/M3 (the feature reads existing `Attendee.noShow` / `Booking` only — no schema changes)
- Don't change the booker-facing booking confirmation/success page (host-view only)
- Don't blend the suspicious-email signal into the numeric score (separate badge, M3)
- Don't show a numerical score when `totalCount < 3` (show the gray "New booker" band instead)
- Don't skip tests for `computeScore` (bands) and the SQL aggregate