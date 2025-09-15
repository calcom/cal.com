# @calcom/web

## 5.3.0

### Minor Changes

- **New Feature**: Minimum Cancellation/Reschedule Notice
  - Added ability to set minimum notice periods for cancellations and reschedules on event types
  - Prevents attendees from cancelling or rescheduling bookings too close to the event start time
  - Configurable per event type with support for minutes, hours, and days
  - Automatic validation and user-friendly error messages
  - Database schema updated with `minimumCancellationNotice` field on EventType model
  - Full integration with existing booking cancellation and reschedule workflows

### Patch Changes

- Enhanced booking cancellation flow with minimum notice validation
- Updated reschedule dialog to handle minimum notice restrictions
- Added MinimumCancellationNoticeInput component for event type configuration
- Improved error messaging for time-restricted cancellations and reschedules

## 5.2.8

### Patch Changes

- Updated dependencies
  - @calcom/embed-core@1.5.3
  - @calcom/embed-react@1.5.3
  - @calcom/embed-snippet@1.3.3

## 4.8.7

### Patch Changes

- Updated dependencies
  - @calcom/embed-core@1.5.2
  - @calcom/embed-react@1.5.2
  - @calcom/embed-snippet@1.3.2

## 4.5.2

### Patch Changes

- Updated dependencies
  - @calcom/embed-core@1.5.1
  - @calcom/embed-react@1.5.1
  - @calcom/embed-snippet@1.3.1

## 4.0.8

### Patch Changes

- Updated dependencies
  - @calcom/embed-core@1.5.0
  - @calcom/embed-react@1.5.0
  - @calcom/embed-snippet@1.3.0

## 3.9.9

### Patch Changes

- Updated dependencies
  - @calcom/embed-core@1.4.0
  - @calcom/embed-react@1.4.0
  - @calcom/embed-snippet@1.2.0

## 3.1.3

### Patch Changes

- Updated dependencies
  - @calcom/embed-react@1.3.0

## 3.0.10

### Patch Changes

- Updated dependencies
  - @calcom/embed-snippet@1.1.2
  - @calcom/embed-react@1.2.2
  - @calcom/embed-core@1.3.2

## 3.0.9

### Patch Changes

- Updated dependencies
  - @calcom/embed-snippet@1.1.1
  - @calcom/embed-react@1.2.1
  - @calcom/embed-core@1.3.1

## 3.0.8

### Patch Changes

- Updated dependencies
  - @calcom/embed-core@1.3.0
  - @calcom/embed-react@1.2.0
  - @calcom/embed-snippet@1.1.0

## 2.9.4

### Patch Changes

- Updated dependencies
  - @calcom/embed-snippet@1.0.9
  - @calcom/embed-react@1.1.1
  - @calcom/embed-core@1.2.1

## 2.9.3

### Patch Changes

- Updated dependencies
  - @calcom/embed-react@1.1.0
  - @calcom/embed-core@1.2.0
  - @calcom/embed-snippet@1.0.8

## 2.7.16

### Patch Changes

- Updated dependencies
  - @calcom/embed-snippet@1.0.7
  - @calcom/embed-react@1.0.12
  - @calcom/embed-core@1.1.5