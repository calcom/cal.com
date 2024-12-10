## TODO
- [ ] Google Calendar Cache


## Bugs
- Show disabled state like in Troubleshooter when in eventType but user settings are selected

## Tests
- Booking Page:
  - [x] Verify that slots shown are as per eventType setting if enabled
  - [x] Verify that even if busy slots is allowed to be selected, during the booking it fails.
  - [x] Verify that if user settings are selected, then booking page uses that for availability check
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
  - [ ] Verify that calendar settings aren't shown and no skeleton loader is shown
- Troubleshooter:
  - [x] Verify that troubleshooter shows correct events
- Edge cases:
  - Verify ensureThatCalendarIsEnabledForConflictCheck works as expected


- Why do we need to use `Suspense` in `CalendarListContainer` now? Compare with main. We were earling also using useSuspense:true but it was working fine


Unit Tests
- eventTypeId in CalendarSwitch was passed as NaN and no error was thrown by TS. We need some tests for this



## Alternate Approach
- We could have used the existing SelectedCalendar row to have enabledForEventTypes field that will hold list of all the events for which it is enabled.
- In case we need to add something specific for event-type in a selected calendar that could go into separate table.
- This approach ensures that there is a single SelectedCalendar row, which can be easily and reliably updated through renewSelectedCalendar fn or Calendar Cache approach which maintains channelId for each SelectedCalendar. Having duplicate would require us to update in multiple rows. If the SelectedCalendar is enabled for 10 events then it would have to be updated at 11 places. 10 for event specific and 1 for user level.
- This approach also keeps the unique constraint same and doesn't require us to add a synthetic unique constraint.
- But while toggling off we need to ensure that we update enabledForEventTypes instead of deleting the row.
- Similar, when it is toggled off at user level, we need to ensure that we still keep the entry if enabledForEventTypes is not empty.