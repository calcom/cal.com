## 1.0.114

## 1.1.0

### Minor Changes

- [#22246](https://github.com/calcom/cal.com/pull/22246) [`d2bbbf3`](https://github.com/calcom/cal.com/commit/d2bbbf3f45c6d1617e244516b2ebbfd717c6db51) Thanks [@devin-ai-integration](https://github.com/apps/devin-ai-integration)! - This change updates the atoms export file to include type for Schedule in Availability Settings atom

### Patch Changes

- [#22182](https://github.com/calcom/cal.com/pull/22182) [`8b3ff0b`](https://github.com/calcom/cal.com/commit/8b3ff0b789b1cb9417a154dcdb0edd448b2847bb) Thanks [@devin-ai-integration](https://github.com/apps/devin-ai-integration)! - This change ensures that the booking dry run flow never reserves an actual booking slot.

### Patch Changes

- [#22148](https://github.com/calcom/cal.com/pull/22148) [`d27490e`](https://github.com/calcom/cal.com/commit/d27490e6f2438d353dfcf3e793c8886e723307f3) Thanks [@supalarry](https://github.com/supalarry)! - test release

## 1.0.63

1. 💥 BREAKING - `useGetBooking` hook has been renamed to `useBooking` hook and `useGetBookings` hook to `useBookings` and the data returned has different
   structure. Here is example response from `useBooking`:

```
{
  "id": 73,
  "uid": "wPnPGRQCnEi8nij7eaQ5E1",
  "title": "with confirmation and limit between Jane Doe and dojgqhylze-clxyyy21o0003sbk7yw5z6tzg-example",
  "description": "",
  "hosts": [
    {
      "id": 95,
      "name": "Jane Doe",
      "timeZone": "Europe/Madrid"
    }
  ],
  "status": "accepted",
  "start": "2024-10-07T08:00:00.000Z",
  "end": "2024-10-07T09:00:00.000Z",
  "duration": 60,
  "eventTypeId": 1207,
  "eventType": {
    "id": 1207,
    "slug": "with-confirmation-and-limit"
  },
  "attendees": [
    {
      "name": "dojgqhylze-clxyyy21o0003sbk7yw5z6tzg-example",
      "timeZone": "Europe/Madrid",
      "language": "en",
      "absent": false
    }
  ],
  "guests": [],
  "meetingUrl": "integrations:daily",
  "location": "integrations:daily",
  "absentHost": false,
  "bookingFieldsResponses": {
    "email": "dojgqhylze@example.com",
    "name": "dojgqhylze-clxyyy21o0003sbk7yw5z6tzg-example",
    "guests": [],
    "phone": "+37128224288",
    "location": {
      "value": "integrations:daily",
      "optionValue": ""
    }
  }
}
```

It is important to note that `useBooking` can return one booking, one individual recurrence of recurring booking or if id of recurring booking is passed then array
of all recurrences within recurring booking. Response schema can be viewed in api docs https://cal.com/docs/api-reference/v2/bookings/get-a-booking and switching
between data response objects in the dropdown. This means that in your frontend you need to handle case if its an individual object or an array of bookings:

```
const { isLoading, data: booking, refetch } = useBooking((router.query.bookingUid as string) ?? "");

if (!Array.isArray(booking)) {
  ...
  return abc
} else {
  ...
  return xyz
}
```

2. FIX - phone booking field not showing correctly https://linear.app/calcom/issue/CAL-4465/platform-fix-phone-booking-field
3. FEAT - ability to hide booker event type details sidebar https://linear.app/calcom/issue/CAL-4443/platform-feat-booker-hide-event-details
4. FEAT - make booker name and email booker properties read only if specified https://linear.app/calcom/issue/CAL-4441/platform-feat-make-name-and-email-fields-not-editable
