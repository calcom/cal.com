## 1.0.108

### Patch Changes

- [#22103](https://github.com/calcom/cal.com/pull/22103) [`61274bc`](https://github.com/calcom/cal.com/commit/61274bc7efc67b162d46b59cd75bd376ad515c51) Thanks [@supalarry](https://github.com/supalarry)! - testing changesets - can ignore this

## 1.0.107

### Patch Changes

- [#22095](https://github.com/calcom/cal.com/pull/22095) [`3c43ce4`](https://github.com/calcom/cal.com/commit/3c43ce4165bce1da29b203d5f2eb62090c5fddd2) Thanks [@supalarry](https://github.com/supalarry)! - test by updating changelog

- [#21864](https://github.com/calcom/cal.com/pull/21864) [`540bf86`](https://github.com/calcom/cal.com/commit/540bf868b5b60a98d9d3aeb565e2089f15c3dfd3) Thanks [@supalarry](https://github.com/supalarry)! - fix saving event type settings

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
