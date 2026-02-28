# 🚀 Feature: Optional Guest Support for Team Events [CAL-5091]

## Description

This PR implements the highly requested "Optional Guest" feature for team event types. It allows specific team members to be invited to a meeting without their availability blocking the booking or requiring their attendance. Optional guests receive the same calendar invite but are clearly marked as optional in Google Calendar, Outlook, and any iCal-compatible client.

## Changes

- **Database:** Added `isOptional` boolean to the Attendee model in Prisma.
- **API:** Updated booking schemas to accept an `isOptional` flag for guests.
- **Compatibility:** Maintained support for the legacy `string[]` guest format while enabling the new object-based format.
- **Integrations:** Mapped `isOptional` status to the standard iCal `ROLE=OPT-PARTICIPANT` property, ensuring correct display in external calendars (Google/Outlook).

## Files Changed (7)

| File | What changed |
|------|-------------|
| `packages/prisma/schema.prisma` | Added `isOptional` field to the Attendee database model |
| `packages/types/Calendar.d.ts` | Added `isOptional` to the Person type used across the app |
| `packages/trpc/server/routers/viewer/bookings/addGuests.schema.ts` | Guest input now accepts an `isOptional` flag |
| `packages/trpc/server/routers/viewer/bookings/addGuests.handler.ts` | Passes the flag through when building guest details |
| `packages/features/bookings/repositories/BookingRepository.ts` | Attendee persistence now includes `isOptional` |
| `packages/features/bookings/lib/bookingCreateBodySchema.ts` | Legacy API guest schema supports the new flag |
| `packages/emails/lib/generateIcsString.ts` | Calendar invites use `OPT-PARTICIPANT` role for optional guests |
