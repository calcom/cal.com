## 1.1.2

## 1.5.0

### Minor Changes

- [#23174](https://github.com/calcom/cal.com/pull/23174) [`618ef63`](https://github.com/calcom/cal.com/commit/618ef630170eb1c05b4a131a01d0c2316b3d1880) Thanks [@SomayChauhan](https://github.com/SomayChauhan)! - fix: Availability atom handleFormSubmit callbacks not triggering

## 1.4.0

### Minor Changes

- [#23119](https://github.com/calcom/cal.com/pull/23119) [`eb1ed10`](https://github.com/calcom/cal.com/commit/eb1ed107ba54a4ae99d0b3aa741ae3076d0ec629) Thanks [@ThyMinimalDev](https://github.com/ThyMinimalDev)! - Added Booker atom prop silentlyHandleCalendarFailures, which ensure the booker still displays slots when the third party calendars credentials are invalid or expired

## 1.3.1

### Patch Changes

- [#22925](https://github.com/calcom/cal.com/pull/22925) [`4c01f17`](https://github.com/calcom/cal.com/commit/4c01f171aebcc5a64453c27e950303902cc15309) Thanks [@sean-brydon](https://github.com/sean-brydon)! - Fixes an issues for the Booker atom wherein when multiple widgets were being placed on the same page, changes made in one widget would also get reflected in the others.

## 1.3.0

### Minor Changes

- [#23060](https://github.com/calcom/cal.com/pull/23060) [`293dd1a`](https://github.com/calcom/cal.com/commit/293dd1a1402fbc0748dffd5619a1b1aacaea9d60) Thanks [@SomayChauhan](https://github.com/SomayChauhan)! - fix: EventTypeSettings Atom crashes on enabling `Lock timezone on booking` in advanced tab

- [#22911](https://github.com/calcom/cal.com/pull/22911) [`d3fbc73`](https://github.com/calcom/cal.com/commit/d3fbc73a3962a9bcca6a95870b146a97f4c7d996) Thanks [@SomayChauhan](https://github.com/SomayChauhan)! - Added new callback functions to the handleFormSubmit method in the EventTypeSettings and AvailabilitySettings atoms. The handleFormSubmit method now accepts an optional callbacks object with the following properties:

  - **onSuccess**: Called when the form submission is successful, allowing additional logic to be executed after the update.

  - **onError**: Called when an error occurs during form submission, providing details about the error to handle specific cases or display custom messages.

- [#23052](https://github.com/calcom/cal.com/pull/23052) [`fc2e81e`](https://github.com/calcom/cal.com/commit/fc2e81e89a6e320c7346dad3259dd51ed700fb30) Thanks [@SomayChauhan](https://github.com/SomayChauhan)! - Added showNoAvailabilityDialog prop to the Booker atom – a Boolean that controls whether the 'no availability' dialog is displayed

- [#22976](https://github.com/calcom/cal.com/pull/22976) [`abe92cd`](https://github.com/calcom/cal.com/commit/abe92cd693f33d20113f5357a960baec042e5256) Thanks [@supalarry](https://github.com/supalarry)! - feat: style calendar settings and availability overrides

- [#22956](https://github.com/calcom/cal.com/pull/22956) [`d18e233`](https://github.com/calcom/cal.com/commit/d18e23378b699e734e9dbbdf93225b02a9059ff4) Thanks [@supalarry](https://github.com/supalarry)! - booker atom: allow toggling org and team info when booking round robin

## 1.2.0

### Minor Changes

- [#22886](https://github.com/calcom/cal.com/pull/22886) [`fb36497`](https://github.com/calcom/cal.com/commit/fb364971fadc1a6796e739956200f12af74e565c) Thanks [@supalarry](https://github.com/supalarry)! - bundle fonts to fix atoms in non-next apps

### Patch Changes

- [#22731](https://github.com/calcom/cal.com/pull/22731) [`ef66187`](https://github.com/calcom/cal.com/commit/ef6618743d5c1367fadf7b98cf15f7ba829535e3) Thanks [@devin-ai-integration](https://github.com/apps/devin-ai-integration)! - Added new startTime prop to the Booker component that allows users to decide the first available date when the booker loads

- [#22815](https://github.com/calcom/cal.com/pull/22815) [`dc967cf`](https://github.com/calcom/cal.com/commit/dc967cffbecdf573aa48777ca7a245a6e633356c) Thanks [@Ryukemeister](https://github.com/Ryukemeister)! - This change fixes an issue in the CalendarSettings atom where the redirect urls were getting only one search param

- [#22701](https://github.com/calcom/cal.com/pull/22701) [`babd514`](https://github.com/calcom/cal.com/commit/babd514c64d0a4b8e05a46619808f201d3e8b0a5) Thanks [@Ryukemeister](https://github.com/Ryukemeister)! - This change fixes date overrides breaking for availability settings atom

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
