# Calendar Sync

Now that we have a dedicated web hook coming from Google Calendar, we can use it to sync specific events from the Google Calendar to the Cal.com Events.

There are some challenges with this approach:

- We need to be able to identify the events that are already in the Cal.com database
- User can drag events around in the Google Calendar, we need to address what happens when a user drags an event to a slot that is not available to the host or participants.
  - Should we create a new event?
  - Should we cancel the existing event?
  - Should we just update the existing event?
  - Should we just trigger an alert to use the reschedule link instead?
- If the user deletes an event from the Google Calendar, do we trigger a cancellation?
  - This is a bit tricky, because if I choose to move the event to a different calendar (ex: move it from my personal gCal to my work gCal), the original calendar will still treat it as a deleted event.

Update, seems like the guests cannot trigger the webhook since they need permissions. IF they try a prompt a request to the owner.

I would like to create a playground to test this out.

Made some tests about the webhooks we receive when a event is updated. We only receive the calendar and the event IDs. We don't receive the actual data that has been changed. So in order to figure out if the event should update a booking we need to fetch the event and figure out a way to see if something actually changed in order to trigger an update.

In order to determine what changed we need to keep track of the original event at the moment of creation. That way we have a point for comparison. Also we need to keep track of the external ID in order to fetch both the booking and the updated event to make a comparison.

The Calendar API’s webhook only tells you that “something changed” (by providing the event ID), not what changed. To track differences over time, you’ll need to implement your own change-tracking logic. Here’s a typical approach:

1. Store a Baseline Copy:\
   When you first receive an event (or at regular sync intervals), store a copy of the event’s details (only the fields you care about) in your database.
2. Fetch Updated Data:\
   When your webhook notifies you that an event was updated, use the event ID to call the API (using the events.get endpoint) to retrieve the current state of the event.
3. Compare Changes:\
   Compare the newly fetched event data with the stored copy to determine which fields have changed. You can do this manually (field-by-field) or use a JSON diff library if the event is represented as JSON.
4. Update Your Records:\
   Update only the fields that have changed in your system. Optionally, you could also maintain a history of changes if needed.

Keep in mind that the Calendar API does not provide a "diff" of changes, so your application must perform the comparison. Some developers also use sync tokens (or incremental sync features) provided by the API to help track changes more efficiently, but ultimately you'll need to compare the new data against your previously stored version to know what changed.

We have BookingReference created from bookings

## TODO

- [ ] Save returned data and id from `calendar.events.insert` into a `BookingReference` when booking
- [ ] On webhook received, lookup `BookingReference` by external ID and compare it with our saved data.
- [ ] Run specific logic depending on data changes:
  - [ ] If start and end times changed, reschedule in Cal.com
  - [ ] If event got deleted, trigger a cancelation in Cal.com
- [ ] E2E test for calendar sync flow and triggers
  - [ ] Figure out how to mock backend calls to google
  - [ ] Booking with a gCal installed should save a `BookingReference` with `rawData`.
  - [ ] should cancel event on Cal.com when it's deleted on Google Calendar
    - [ ] Mock a webhook received
    - [ ] Mock `calendar.events.get` response for a removed event
  - [ ] should reschedule event on Cal.com when it's rescheduled on Google Calendar
    - [ ] Mock `calendar.events.get` response for a rescheduled event
  - [ ] should add guest to event on Cal.com when it's added to event on Google Calendar
    - [ ] Mock `calendar.events.get` response for a an added guest event

## Follow up improvements

- [ ] If guests got added, add them in Cal.com
- [ ] If guests got removed, remove them in Cal.com
