- googleChannelExpiration is a string which might cause problems with date/number comparisons like `lt` in prisma, which can possibly cause problems with date comparisons. Though not practical right now

## Responsibilities
- File:`/api/calendar-cache/cron` - Runs every minute and takes care of two things:
  1. Watching calendars
    - Identifies selectedCalendars that are not watched(identified by `googleChannelId` being null) and watches them
      - When feature is enabled, it starts watching all related calendars
        - SelectedCalendars with same `externalId` are considered same from CalendarCache perspective
      - This is how a newly added SelectedCalendar record gets its googleChannel props set
      - CalendarService.watchCalendar ensures that the new subscription is not created unnecessarily, reusing existing SelectedCalendar googleChannel props when possible.
    - Identifies calendars that are watched but have their subscription about to expire(identified by `googleChannelExpiration` being less than current tomorrow's date) and watches them again
  2. Unwatching calendars
    - It takes care of cleaning up when the calendar-cache feature flag is disabled.
- File:`calendar-cache-cleanup`
  - Deletes all CalendarCache records that have expired
- File:`googlecalendar/api/webhook`
  - Populates CalendarCache records by fetching availability.

## Availability Checking Flow
- CalendarService.getAvailability is called 
- It checks if CalendarCache exists for the calendar
- If it does, it fetches availability from CalendarCache
- If it doesn't, it fetches availability from the third party calendar service
- It doesn't populate/update CalendarCache. That is solely the responsibility of webhook