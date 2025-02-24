## 0.0.51
Released to support PR https://github.com/calcom/cal.com/pull/17224 which enabled attendee specified location during booking.

## 0.0.41
Released to support handle cancel booking passing oauth client id to webhooks.

## 0.0.38
#### Feature: Added Support for AdvancedTab Event-Type Attributes in API
- **Booker Layouts**: 
  - Added `transformBookerLayoutsApiToInternal` translator to enable the `bookerLayouts` attribute in the event-type API.
  - Added `transformBookerLayoutsInternalToApi` translator to improve clarity and readability of `bookerLayouts` response data.

- **Event-Type Colors**:
  - Added `transformEventColorsApiToInternal` translator to enable the `color` attribute in the event-type API.
  - Added `transformEventTypeColorsInternalToApi` translator to enhance the readability of the `color` attribute in the response.

- **Confirmation Policy**:
  - Added `transformConfirmationPolicyApiToInternal` translator to enable the `confirmationPolicy` attribute in the event-type API.
  - Added `transformRequiresConfirmationInternalToApi` translator to improve the readability of `requiresConfirmation` data in the response.

- **Seats**:
  - Added `transformSeatsApiToInternal` translator to enable the `seats` attribute in the event-type API.
  - Added `transformSeatsInternalToApi` translator to enhance readability and clarity of the `seats` data.

## 0.0.37
Released to support PR https://github.com/calcom/cal.com/pull/16200

## 0.0.36

Released to support PR https://github.com/calcom/cal.com/pull/16685

## 0.0.31

PR https://github.com/calcom/cal.com/pull/16414 fixed issue of deleting and rescheduling recurring events.

## 0.0.30

• Feature: Added support for recurringEvent in api/v2/event-types.
• Introduced the transformApiEventTypeRecurrence translator in packages/lib/event-types/transformers/api-request.ts. This enables the “recurringEvent” feature in the event-type API.
• Added getResponseEventTypeRecurrence translator in packages/lib/event-types/transformers/api-response.ts to return data in a more human-friendly format.

## 0.0.28

• Feature: Added support for new event-type limits in the API.
• Introduced the transformApiEventTypeFutureBookingLimits translator in packages/lib/event-types/transformers/api-request.ts. This enables the “Limit future bookings” feature in the event-type API.
• Introduced the transformApiEventTypeIntervalLimits translator in packages/lib/event-types/transformers/api-request.ts. This allows the “Limit total booking duration” and “Limit booking frequency” features in the event-type API.
• Added getResponseEventTypeIntervalLimits translator in packages/lib/event-types/transformers/api-response.ts to return data in a more human-friendly format.
• Added getResponseEventTypeFutureBookingLimits translator in packages/lib/event-types/transformers/api-response.ts to improve the clarity and readability of the response data.

## 0.0.26

Update `packages/app-store/office365calendar/lib/CalendarService.ts` "translateEvent" content so that in microsoft outlook calendar event the description
has newlines instead of being all in 1 line.

## 0.0.25

Refactor "packages/lib/event-types/transformers/api-request.ts" getResponseEventTypeBookingFields - make sure that booking fields with options don't have
undefines options.

## 0.0.24

Refactor "packages/lib/event-types/transformers/api-request.ts" - we access event-type booking fields in database and then distinguish them as either
created by the user or system. Then in v2 api "event-types_2024_06_14/services/output-event-types.service.ts" we first parse them and then filter
out only user fields. This is done because when creating an event-type we only store user passed booking fields, but if someone already had created
booking-fields using event-types version 2024_04_15, then they contained system fields which is why event-types 2024_06_14 controller was failing.

## 0.0.23

Update "createBooking" (packages/features/bookings/lib/handleNewBooking/createBooking.ts) that is used by handleNewBooking (packages/features/bookings/lib/handleNewBooking.ts) to correctly handle metadata of a re-scheduled booking. Previously,
metadata of original booking was overwriting metadata in the request body of the new booking (rescheduled), but now
request body overwrites metadata of the original body so that whatever metadata is newest ends up as the metadata of rescheduled booking. However, only common properties are overwritten, if the original booking has a key that re-schedule booking request body metadata does not have, then it will be persisted in the re-scheduled booking.

## 0.0.22

Export `updateNewTeamMemberEventTypes` from `"@calcom/lib/server/queries"` so that we can assign newly created organizations
teams members to event-types that have been marked as "assign all team members"

## 0.0.20

In event-types create handler (packages/trpc/server/routers/viewer/eventTypes/create.handler.ts) enable passing scheduleId so that when an event type is created it can be connected
to a specific schedule.

## 0.0.19

Added - create event type handler was [updated](https://github.com/calcom/cal.com/pull/15774) for system admins not to be required
to be part of org team when creating event type for team. Update libraries to include these changes.
