This is to be deleted before merging
## TODO
- [x] Google Calendar Cache handling for duplicate selected-calendars now for different eventTypes


## Bugs
- Show disabled state like in Troubleshooter when in eventType but user settings are selected

## Tests
- Booking Page(User Event Type):
  - [x] Verify that slots shown are as per eventType setting if enabled
  - [x] Verify that even if busy slots is allowed to be selected, during the booking it fails.
  - [x] Verify that if user settings are selected, then booking page uses that for availability check
  - Booking Page(Dynamic Group Event Type):
    - [x] Verify that slots shown are as per user setting
- apps/installed
  - [x] Verify that selected calendars are correctly shown and can be toggled on/off
- /settings/my-account/calendars
  - [x] Verify that selected calendars are correctly shown and can be toggled on/off
  - [x] Verify that if connection can be deleted from there
- eventtype/advanced - User Event Type
  - [x] Verify that skeleton loader is shown
  - [x] Verify that eventType setting is correctly shown and can be toggled on/off
  - [x] Verify that user can switch b/w eventType and user settings
  - [x] Verify that user settings are disabled
  - [x] Verify that when no calendars, then there are no connected calendars settings shown.
- eventtype/advanced - Team Event Type
  - [x] Verify that calendar settings aren't shown and no skeleton loader is shown
- Troubleshooter:
  - [x] Verify that troubleshooter shows correct events
- Edge cases:
  - [ ] Verify ensureThatCalendarIsEnabledForConflictCheck works as expected
- API V1:
  - [x] Verify endpoints 
    - [x] GET /api/v1/selected-calendars - Ensured only user-level records are fetched
    - [x] DELETE /api/v1/selected-calendars/:id - Ensured only one record is deleted
    - [x] GET /api/v1/selected-calendars/:id - Works
    - [x] POST /api/v1/selected-calendars - Ensured no duplicates
    - [x] Patch /api/v1/selected-calendars/:id - Fixed that returned response is valid
  - [x] Ensure that the response payload doesn't change - Only eventTypeId is shown which is fine
- API V2:
  - [ ] Verify endpoints
- Calendar Cache:


- Why do we need to use `Suspense` in `CalendarListContainer` now? Compare with main. We were earling also using useSuspense:true but it was working fine


Unit Tests
- eventTypeId in CalendarSwitch was passed as NaN and no error was thrown by TS. We need some tests for this
- [x] handleNewBooking
- [x] getSchedule tests with eventTypeId
- [x] SelectedCalendarRepository tests
- [x] More CalendarCache tests
- [x] useEventLevelSelectedCalendars was accidentally set to true in defaultEvents causing no busytimes for dynamic group eventType
