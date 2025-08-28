## EventBus
Any feature could define an event's handler in packages/feature/feature-name/events/EVENT_NAME/handler.ts for that event in the feature. Across the codebase, even though different EventBuses might be used, but we could use unique names for the events.
 - It allows  us to emit any event that could be handled. It could also allow other subscribers to handle that event 
    e.g. a bookingCreated event could trigger multiple subscribers(in our case that could be as simple as creating a task for Tasker) like
    - Routing Forms feature could subscribe
       - Record AssignmentReason
    - webhooks feature which is in the works here https://github.com/calcom/cal.com/pull/23247, would subscribe to the bookingCreated/bookingRescheduled events to trigger the following:
         - No Show triggers
         - Booking Created triggers
         - Booking Updated triggers
         - Booking Rescheduled triggers
    - private-links(also called hashed links) feature subscribes for bookingCreated and updates the usage of the hashed link.
    - Maybe we could create a catch-call place for handlers/subscribers that don't make sense at a specific place. So, the location could be something like packages/features/booking/events/bookingCreated/specificHandlerName.ts
    - updateLastActiveAt(for the host that got booked). Right now this is done synchronously in the booking flow and not via Tasker.
    - NotificationSubscriber(which itself could send notifications through multiple channels)
        - Emails
            - Scheduled Emails
                - Mandatory Reminders
            - Immediate Emails
                - Booking Confirmation
                - Booking Rescheduled
                - Booking Requested
        - Workflow(maybe not part of Notifications but postBookingActions?)


## Phases of booking creation
Any of the following phases could fail the booking(or additionally suggest a different action to booker on failure). Throughout the phases a well defined context that keeps on getting enriched is available to the next phase. THere would be an input context and output context.

### Quick Enrichment Phase - Focus is on least number of DB calls and quick enrichment of the input context
1. EventType Enrichment as needed by quick validation phase
    - [x] Get `eventType` From DB
        - [x] If not found, fail the booking

### QuickValidation Phase - Focus is on validation of the input context without needing any external data(like DB access)
1. Booking request payload schema validation - 
     - [x] Zod schema validation -> async(due to phone validation) but doesn't require DB access
        - [x] Pass -> Go through
        - [x] Fail -> Fail the booking
     - [x] Invalid combination of params .e.g seatsPerTimeSlot and recurring both set meaning a seated booking for recurring event which isn't supported
        - [x] Fail -> Fail the booking
2. Booking Data validation(Synchronous - Validate the booking data without DB access)
    - [x] Timeslot validation. Within bounds
        - [x] Yes -> Go through
        - [x] No -> Fail the booking
3. Booking Allowed using the booker email ?
    - [x] Booker Email blacklisted(that requires login)
        - [x] No -> Go through
        - [x] Yes -> Fail the booking if the user is not logged in as the booker email
    - [x] Attendee Email blacklisted.
        - [x] No -> Go through
        - [x] Yes -> Fail the booking
    - [x] Booker Email crossed the limit of active bookings for the event type
        [x] No -> Go through
        [x] Yes -> Fail the booking and offer to reschedule one of the earlier bookings to the new time

### Deep Enrichment Phase - Focus is on deep enrichment of the input context with external data(like DB access) except availability related DB data
1. EventType Enrichment
    - Get `eventType` From DB
        - If not found, fail the booking
2. if `routingFormResponseId` is present
    - Get `routingFormResponse` From DB
        - If not found, fail the booking
3. load qualifiedHosts and fixedHosts from DB
   - It includes their credentials(delegation or regular credentials) and other required details.
   - If no qualifiedHosts or fixedHosts, fail the booking
4. Remove guests that are assigned team members for the event-type. -> Sanitizes/modifies input data.
5. If requires payment, send payment related data.
6. Derive various properties from the input data like isDryRun, isRescheduling, isSeatedEvent ....


### Deep Validation Phase - Focus is on validation of the input context with more enriched data that is now available from the deep enrichment phase
- Booking already exists for the same time slot
    - [ ] No -> Go through
    - [ ] Yes -> Redirect to the existing booking

### Availability Loading Phase - Focus is on loading availability related DB data
1. For each qualifiedHost and fixedHost, load availability from DB and connected Calendars

### Post Enrichment Validation Phase
1. Validate booking duration against EventType.length
    - Passes -> Go through
    - Fails -> Fail the booking
2. Any of the qualifiedHosts or fixedHosts is blacklisted(blocked from being booked), fail the booking

### Booking Creation Phase
1. New/Fresh Booking Flow
    - SingleSeatBookingHandler(for non-seated bookings) -> Creates a new booking
       - Create a Booking in DB
       - Build a corresponding CalendarEvent object - Right now we build it before event creating a booking, I don't think it makes sense to do it before creating a booking in DB as Calendar Event in a calendar like (Google Calendar) can only be created when we have created that booking.
    - MultiSeatBookingHandler(for seated bookings) -> Creates a new booking

2. Reschedule Booking Flow
   - RescheduleSingleSeatBookingHandler(for non-seated bookings) -> Creates a new booking
   - RescheduleMultiSeatBookingHandler -> Creates a new booking


### App sync phase - Sync to Calendar/Conferencing App
- Builds a corresponding CalendarEvent object from the booking.
- Integrates with EventManager to create/update Calendar Events/Conferencing Meetings

### End Processing Phase
- Update BookingReference in DB with the external references(from Calendar/Conferencing App)
- Return the response to the booker
