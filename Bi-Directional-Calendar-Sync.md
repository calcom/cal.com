# Bi-Directional Calendar Sync

## Introduction
Bi-Directional Calendar Sync allows changes made in your Google Calendar to automatically reflect in your Cal.com bookings. When an event is updated or deleted in Google Calendar, the corresponding booking in Cal.com will be updated or cancelled accordingly.

## Features
- **Automatic Cancellation**: When an event is deleted in Google Calendar, the corresponding Cal.com booking is automatically cancelled.
- **Time/Date Updates**: Changes to event time or date in Google Calendar are synchronized back to Cal.com bookings.
- **Real-time Syncing**: Updates are processed via Google Calendar webhooks for near real-time synchronization.

## Getting Started

### Prerequisites
- A Cal.com account with Google Calendar integration enabled
- Google Calendar connected as your destination calendar for bookings

### Setup
1. Navigate to "Settings > Connected Calendars" in your Cal.com dashboard
2. Ensure Google Calendar is connected as your destination calendar
3. Bi-directional sync is automatically enabled for all new Google Calendar connections

### Configuration
No additional configuration is needed. Once Google Calendar is connected as your destination calendar, bi-directional sync is automatically enabled.

## How It Works
1. When a booking is created in Cal.com, it's added to your Google Calendar
2. Cal.com establishes a "watch" on your Google Calendar to receive change notifications
3. When you modify or delete the event in Google Calendar:
   - Google sends a notification to Cal.com
   - Cal.com identifies the corresponding booking
   - The booking is updated or cancelled to match the Google Calendar event

## Limitations
- Only time/date changes and deletions are currently synchronized
- Past events are not affected by changes in Google Calendar
- Notifications from Google Calendar may occasionally be delayed
- Sync is not 100% reliable - occasional dropped notifications may occur
- Recurring events may have special handling requirements
- Currently only supports Google Calendar (Outlook support coming in the future)

## Troubleshooting

### Common Issues
- **Changes in Google Calendar not reflecting in Cal.com**:
  - Webhook notifications can be delayed by up to an hour in rare cases
  - Check if the event is in the past (past events are not modified)
  - Verify your Google Calendar connection is still active

- **Multiple updates occurring for a single change**:
  - This can happen when multiple subscriptions exist for the same calendar
  - This is normal behavior and Cal.com handles duplicate notifications

- **Calendar disconnection issues**:
  - If you change your destination calendar, you may need to reconnect

## Upcoming Features (Phase 2)
- Event title synchronization
- Advanced conflict resolution
- Improved error handling and monitoring
- Support for Microsoft Outlook Calendar
- User-configurable sync preferences
- Enhanced reliability and performance

## For Developers

### Architecture
The bi-directional sync implementation consists of several components:

1. **Webhook Handler** (`packages/app-store/googlecalendar/api/webhook.ts`):
   - Receives notifications from Google Calendar
   - Routes data to appropriate services

2. **CalendarService**:
   - `onWatchedCalendarChange` method processes calendar changes
   - Identifies corresponding Cal.com bookings
   - Applies necessary updates or cancellations

3. **Database Models**:
   - Enhanced `BookingReference` with `calendarEventId` field
   - `DestinationCalendar` stores Google Channel information

### API References
- [Google Calendar Push Notifications](https://developers.google.com/workspace/calendar/api/guides/push)

### Testing
- E2E tests available in `apps/web/playwright/calendar-sync.e2e.ts`
- Mock calendar app (`packages/app-store/mock-calendar-app`) for testing

### Implementation Notes
- We track the last processed time for reliable synchronization
- Multiple webhook notifications for the same event are handled appropriately
- Channel subscriptions are renewed automatically before expiration 



Flow:
- User connects Google Calendar to Cal.com
- A cron runs every few mins to check if there is a DestinationCalendar record that needs to be watched
- If there is a record that needs to be watched, it will be watched
   - If it is already being watched via SelectedCalendar, we still rewatch it but we plan not to.
   - Due to re-watch we create two subscriptions for the same externalId and when something changes we receive two notifications.
      - One channel ID corresponds to type=SelectedCalendar and other corresponds to type=DestinationCalendar and thus they do different jobs.
