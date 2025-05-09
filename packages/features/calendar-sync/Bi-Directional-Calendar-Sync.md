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
- Currently only supports Google Calendar (Outlook support coming in the future)

## Troubleshooting


## For Developers

### API References
- [Google Calendar Push Notifications](https://developers.google.com/workspace/calendar/api/guides/push)

## Architecture:

Actors Involved:
- `CRON:bi-directional-calendar-sync`
- `CRON:subscription-cron`
- Third Party Calendar Webhook(webhook.handler.ts)
- handleNewBooking.ts
- CalendarService#onWatchedCalendarChange

Flow:
- Bi-directional sync is enabled for User's organization
- On creating a booking we push a task to Tasker that would create a CalendarSync record. 
   NOTE: It could be delayed by a few minutes, due to how the tasker works. So,if a booking is created for the first time in a calendar, it could take a few minutes for sync to actually get enabled. We could improve this further by creating CalendarSync records on DestinationCalendar upsert_
- `CRON:bi-directional-calendar-sync` runs every few minutes and it does the following.
   - Creates a subscription record for each of CalendarSync records that doesn't have a subscription record yet. The subscription record doesn't have channel related fields yet, it would just have credentialId, providerType, externalCalendarId, status=PENDING.
- `CRON:subscription-cron` runs every few minutes and it does the following. We keep this cron separate as it could be used by both SelectedCalendar and CalendarSync.
   - For each of the status=PENDING records in CalendarSubscription table, it creates a subscription in provider using the credential and updates the subscription record with the channel related fields, moving the status to ACTIVE.
- When both the above Crons have run atleast once, we consider the sync to be established for all the required calendars for bi-directional sync.
- Now, lets say a booking is created in Cal.com, it would be added to Google Calendar as well. At this moment, BookingReference table holds uid that refers to the eventId in third party calendar(in this case Google Calendar).
- Now let's say that the booking's time changes, we will receive a webhook event that will be handled by webhook.handle.ts.
   - It identifies that for the particular channel, if there is associated CalendarSync, if yes it means that there might be something to sync from the third party calendar events to Cal.com bookings.
   - We delegate the work to CalendarService#onWatchedCalendarChange method, which will do the following:
      - It fetches latest updated few events from the third party calendar.
      - For every such third party calendar event, that has corresponding BookingReference.uid, it updates the corresponding Booking record in Cal.com with the new details from the third party calendar event.

Notes:
- We could use lastUsedAt field in CalendarSync table, which is update every time a booking uses that calendar as the destination. We could start updating that as well in a follow up as we avoid the need to make the changes in handleNewBooking flow.

FAQ:
- Existing bookings in the system that are re-scheduled, will they be synced back from the third party calendar?
  - Yes, they will be synced back as those bookings still have BookingReference.uid to identify the eventId in third party calendar
  - [ ] Test this

TODO:
- [ ] Subscription renewal support
- [ ] Reuse subscription from SelectedCalendar
- [ ] Ensure that a subscription record is never deleted, unless it has been expired by Cal.com itself, then it is safe to be deleted. This is important because otherwise we wouldn't be able to stop subscription on that if needed and such channels could cause increased push notification delay. 
- [ ] Review indices carefully on DB. Maybe use explain analyze to check if they are being used.
- [ ] When does updateEvent return an array of NewCalendarEventType?
- [ ] Tests for Google CalendarService


- Tests:
   - [ ] Subscription renewal
   - [ ] Reusing subscription from SelectedCalendar and CalendarSubscription both

Follow up:
- [ ] Cleanup
   - [ ] unusubscribe from channel, resourceId which are not connected to any CalendarSync record or don't have SelectedCalendar record with same channelId and resourceId.
- [ ] Feature Completeness
   - [ ] Cancel when all attendees(booker + guests and not organizer) have declined the calendar-event
   - [ ] Send email and trigger other things that are done when a booking is cancelled
   - [ ] Delegation Credential support
   - [ ] Calendar Event time change sync support(Test with different timezone of Google Calendar and Cal.com account and machine's timezone.)
       - Do we need it ?
- [ ] Test and support recurring events(Beta)