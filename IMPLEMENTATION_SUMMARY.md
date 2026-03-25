# CAL-5091: Add Team Member as Optional Guest - Implementation Summary

## Database Changes

### `packages/prisma/schema.prisma`
- Add `optionalGuests User[] @relation("OptionalGuestEventTypes")` to EventType model
- Add `optionalGuestEventTypes EventType[] @relation("OptionalGuestEventTypes")` to User model

### `packages/prisma/migrations/[timestamp]_add_optional_guests/migration.sql`
- Create junction table `_OptionalGuestEventTypes`
- Add foreign keys to EventType and User tables

## New Files Created

### `packages/features/eventtypes/components/OptionalGuestSettings.tsx`
- New React component for the optional guests UI
- Uses SettingsToggle pattern consistent with other advanced settings
- Shows UpgradeTeamsBadge for non-team plans
- Allows selecting team members as optional guests
- Shows info notice about no conflict checking

### `packages/features/upgrade-badges/UpgradeTeamsBadge.tsx`
- New badge component (if not already existing)
- Links to teams upgrade page

### `packages/features/bookings/lib/__tests__/optionalGuests.test.ts`
- Unit tests for optional guest functionality

## Modified Files

### `packages/features/eventtypes/components/tabs/advanced/EventTypeAdvancedTab.tsx`
- Import OptionalGuestSettings component
- Add OptionalGuestSettings to the advanced tab
- Show for team event types, with upgrade badge for non-team

### `apps/web/pages/event-types/[type].tsx` (FormValues type)
- Add `optionalGuests: OptionalGuest[]` to FormValues type

### `packages/trpc/server/routers/viewer/eventTypes/update.handler.ts`
- Handle optionalGuests in the update handler
- Validate that all guests are team members
- Update the database relation

### `packages/trpc/server/routers/viewer/eventTypes/get.handler.ts`
- Include optionalGuests in the eventType query response

### `packages/features/bookings/lib/handleNewBooking/index.ts`
- Load optionalGuests from eventType
- Add optional guests to calendar event attendees with optional: true
- Skip availability/conflict checking for optional guests

### `packages/types/Calendar.d.ts`
- Add `optional?: boolean` to Attendee type
- Add `optional?: boolean` to Person type

### `packages/app-store/googlecalendar/lib/CalendarService.ts`
- Handle optional: true in attendees
- Map to Google Calendar API format: `{ optional: true }`

### `packages/app-store/office365calendar/lib/CalendarService.ts`
- Handle optional: true in attendees
- Map to Microsoft Graph API format: `{ type: "optional" }`

### `apps/web/public/static/locales/en/common.json`
- Add translation keys for new UI strings

## Key Design Decisions

1. **Team Members Only**: Optional guests can only be team members
   - Prevents spam from random email addresses
   - Validates on server-side in update handler

2. **No Conflict Checking**: Optional guests are excluded from availability checks
   - They don't affect booking availability
   - Only invited after booking is confirmed

3. **Calendar Support**: Optional status is propagated to:
   - Google Calendar: `optional: true` in attendee object
   - Microsoft 365: `type: "optional"` in attendee object  
   - iCal: `ROLE=OPT-PARTICIPANT` parameter

4. **UI Pattern**: Uses SettingsToggle with UpgradeTeamsBadge
   - Consistent with other event type settings
   - Clear indication of team plan requirement
