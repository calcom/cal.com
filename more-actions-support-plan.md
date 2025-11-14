# Plan: Complete Booking Audit Coverage

## Analysis Summary

### Currently Audited Operations

- CREATED, CANCELLED, ACCEPTED, REJECTED, RESCHEDULED
- ATTENDEE_ADDED, ATTENDEE_REMOVED
- REASSIGNMENT (includes title changes during reassignment)
- LOCATION_CHANGED
- HOST_NO_SHOW_UPDATED, ATTENDEE_NO_SHOW_UPDATED
- RESCHEDULE_REQUESTED

### Missing Operations Identified

## 1. Metadata Changes (Group: METADATA_CHANGED)

**Fields**: title, description

- **Location**: `apps/api/v1/pages/api/bookings/[id]/_patch.ts`
- **Schema**: `{ title?: {old, new}, description?: {old, new} }`
- **Note**: Only include fields that changed

## 2. Status Changes (Use Existing: StatusChangeAuditActionService)

**Statuses**: PENDING, AWAITING_HOST

- **Action**: Verify all status transitions properly call StatusChangeAuditActionService
- **No new service needed** - use existing infrastructure

## 3. Payment Status Changes (Group: PAYMENT_STATUS_CHANGED)

**Field**: paid (Boolean)

- **Locations**:
- `packages/app-store/_utils/payments/handlePaymentSuccess.ts`
- `packages/app-store/paypal/api/capture.ts`
- `packages/app-store/paypal/lib/Paypal.ts`
- `packages/features/ee/payments/api/webhook.ts`
- **Schema**: `{ paid: {old: boolean, new: boolean} }`
- **Note**: Triggered when payment is completed

## 4. Recording Status Changes (Group: RECORDING_STATUS_CHANGED)

**Field**: isRecorded (Boolean)

- **Location**: `apps/web/app/api/recorded-daily-video/route.ts`
- **Schema**: `{ isRecorded: {old: boolean, new: boolean} }`
- **Note**: Triggered when video recording is ready

## 5. Rating and Feedback (Group: RATING_SUBMITTED)

**Fields**: rating (Int), ratingFeedback (String)

- **Location**: `packages/trpc/server/routers/publicViewer/submitRating.handler.ts`
- **Schema**: `{ rating: number, feedback?: string }`
- **Note**: Submitted by attendee after booking completion

## 6. Internal Notes (Separate: INTERNAL_NOTE_ADDED)

**Related Model**: BookingInternalNote

- **Location**: `packages/features/bookings/lib/handleInternalNote.ts`
- **Schema**: `{ notePresetId?: number, text?: string, createdById: number }`
- **Note**: Separate table, but should be audited as booking-related action

## 7. Booking Reported (Separate: REPORTED)

**Related Model**: BookingReport

- **Location**: `packages/trpc/server/routers/viewer/bookings/reportBooking.handler.ts`
- **Schema**: `{ reason: string, reportedBy: string }`
- **Note**: Creates BookingReport record, may also cancel booking

## 8. Time Changes Without Reschedule (Group: TIME_CHANGED)

**Fields**: startTime, endTime

- **Location**: `apps/api/v1/pages/api/bookings/[id]/_patch.ts`
- **Schema**: `{ startTime?: {old: DateTime, new: DateTime}, endTime?: {old: DateTime, new: DateTime} }`
- **Note**: Direct time updates via API (not full reschedule flow)

## 9. Responses/Custom Inputs Updated (Group: RESPONSES_UPDATED)

**Field**: responses (Json)

- **Location**: `packages/trpc/server/routers/viewer/bookings/editLocation.handler.ts` (updates responses.location)
- **Schema**: `{ responses: {old: Json, new: Json} }`
- **Note**: When booking form responses are modified

## Implementation Plan

### Phase 1: Create Grouped Action Services

#### 1.1 MetadataChangedAuditActionService

- **File**: `packages/features/booking-audit/lib/actions/MetadataChangedAuditActionService.ts`
- **Action**: METADATA_CHANGED
- **Fields**: title (optional), description (optional)

#### 1.2 PaymentStatusChangedAuditActionService

- **File**: `packages/features/booking-audit/lib/actions/PaymentStatusChangedAuditActionService.ts`
- **Action**: PAYMENT_STATUS_CHANGED
- **Fields**: paid (required)

#### 1.3 RecordingStatusChangedAuditActionService

- **File**: `packages/features/booking-audit/lib/actions/RecordingStatusChangedAuditActionService.ts`
- **Action**: RECORDING_STATUS_CHANGED
- **Fields**: isRecorded (required)

#### 1.4 RatingSubmittedAuditActionService

- **File**: `packages/features/booking-audit/lib/actions/RatingSubmittedAuditActionService.ts`
- **Action**: RATING_SUBMITTED
- **Fields**: rating (required), feedback (optional)

#### 1.5 InternalNoteAddedAuditActionService

- **File**: `packages/features/booking-audit/lib/actions/InternalNoteAddedAuditActionService.ts`
- **Action**: INTERNAL_NOTE_ADDED
- **Fields**: notePresetId (optional), text (optional), createdById (required)

#### 1.6 ReportedAuditActionService

- **File**: `packages/features/booking-audit/lib/actions/ReportedAuditActionService.ts`
- **Action**: REPORTED
- **Fields**: reason (required), reportedBy (required)

#### 1.7 TimeChangedAuditActionService

- **File**: `packages/features/booking-audit/lib/actions/TimeChangedAuditActionService.ts`
- **Action**: TIME_CHANGED
- **Fields**: startTime (optional), endTime (optional)

#### 1.8 ResponsesUpdatedAuditActionService

- **File**: `packages/features/booking-audit/lib/actions/ResponsesUpdatedAuditActionService.ts`
- **Action**: RESPONSES_UPDATED
- **Fields**: responses (required - old and new JSON)

### Phase 2: Update Prisma Schema

- Add new actions to BookingAuditAction enum:
- METADATA_CHANGED
- PAYMENT_STATUS_CHANGED
- RECORDING_STATUS_CHANGED
- RATING_SUBMITTED
- INTERNAL_NOTE_ADDED
- REPORTED
- TIME_CHANGED
- RESPONSES_UPDATED
- Run migration: `yarn prisma migrate dev`

### Phase 3: Update BookingAuditService

- Add methods for each new action:
- `onMetadataChanged()`
- `onPaymentStatusChanged()`
- `onRecordingStatusChanged()`
- `onRatingSubmitted()`
- `onInternalNoteAdded()`
- `onReported()`
- `onTimeChanged()`
- `onResponsesUpdated()`
- Update `getDisplaySummary()` switch statement
- Update `getDisplayDetails()` switch statement

### Phase 4: Update BookingEventHandlerService

- Add handler methods for each new action

### Phase 5: Integrate Audit Calls

#### 5.1 API PATCH Endpoint

- `apps/api/v1/pages/api/bookings/[id]/_patch.ts`
- Add audit calls for title, description, startTime, endTime changes

#### 5.2 Payment Success Handlers

- `packages/app-store/_utils/payments/handlePaymentSuccess.ts`
- `packages/app-store/paypal/api/capture.ts`
- `packages/app-store/paypal/lib/Paypal.ts`
- `packages/features/ee/payments/api/webhook.ts`
- Add audit calls when paid status changes

#### 5.3 Recording Ready Handler

- `apps/web/app/api/recorded-daily-video/route.ts`
- Add audit call when isRecorded is set to true

#### 5.4 Rating Submission Handler

- `packages/trpc/server/routers/publicViewer/submitRating.handler.ts`
- Add audit call when rating is submitted

#### 5.5 Internal Note Handler

- `packages/features/bookings/lib/handleInternalNote.ts`
- Add audit call after internal note is created

#### 5.6 Report Booking Handler

- `packages/trpc/server/routers/viewer/bookings/reportBooking.handler.ts`
- Add audit call when booking is reported

#### 5.7 Edit Location Handler

- `packages/trpc/server/routers/viewer/bookings/editLocation.handler.ts`
- Add audit call when responses are updated

### Phase 6: Verify Status Change Coverage

- Review all places where booking status is updated
- Ensure PENDING and AWAITING_HOST transitions use StatusChangeAuditActionService
- Add audit calls if missing

### Phase 7: Update Architecture Documentation

- Update `ARCHITECTURE.md` with all new actions
- Add JSON schema examples for each action
- Document when each action is triggered

## Implementation Details

### Action Service Pattern

All new action services should:

1. Extend `IAuditActionService` interface
2. Use `AuditActionServiceHelper` for versioning
3. Implement `parseFields()`, `parseStored()`, `getVersion()`
4. Implement `getDisplaySummary()` and `getDisplayDetails()` with i18n support
5. Export TypeScript type for audit data
6. Handle optional fields gracefully

### Change Tracking Pattern

- Use `{ old: T | null, new: T }` pattern for field changes
- Only include fields that actually changed (for grouped actions)
- For new records (rating, internal notes), no "old" value needed

## Files to Create

1. `packages/features/booking-audit/lib/actions/MetadataChangedAuditActionService.ts`
2. `packages/features/booking-audit/lib/actions/PaymentStatusChangedAuditActionService.ts`
3. `packages/features/booking-audit/lib/actions/RecordingStatusChangedAuditActionService.ts`
4. `packages/features/booking-audit/lib/actions/RatingSubmittedAuditActionService.ts`
5. `packages/features/booking-audit/lib/actions/InternalNoteAddedAuditActionService.ts`
6. `packages/features/booking-audit/lib/actions/ReportedAuditActionService.ts`
7. `packages/features/booking-audit/lib/actions/TimeChangedAuditActionService.ts`
8. `packages/features/booking-audit/lib/actions/ResponsesUpdatedAuditActionService.ts`

## Files to Modify

1. `packages/prisma/schema.prisma` - Add enum values
2. `packages/features/booking-audit/lib/service/BookingAuditService.ts` - Add methods
3. `packages/features/bookings/lib/onBookingEvents/BookingEventHandlerService.ts` - Add handlers
4. `apps/api/v1/pages/api/bookings/[id]/_patch.ts` - Add audit calls
5. `packages/app-store/_utils/payments/handlePaymentSuccess.ts` - Add audit calls
6. `apps/web/app/api/recorded-daily-video/route.ts` - Add audit calls
7. `packages/trpc/server/routers/publicViewer/submitRating.handler.ts` - Add audit calls
8. `packages/features/bookings/lib/handleInternalNote.ts` - Add audit calls
9. `packages/trpc/server/routers/viewer/bookings/reportBooking.handler.ts` - Add audit calls
10. `packages/trpc/server/routers/viewer/bookings/editLocation.handler.ts` - Add audit calls
11. `packages/features/booking-audit/ARCHITECTURE.md` - Update documentation

## Decision Points

1. **Responses Updated**: Should we audit all response changes or only specific fields?

- Decision: Audit when responses JSON changes (detected via deep comparison)

2. **Payment Status**: Should we track payment attempts or only successful payments?

- Decision: Only track when paid changes from false to true (successful payment)

3. **Internal Notes**: Should these be in booking audit or separate audit trail?

- Decision: Include in booking audit for complete booking history

4. **Time Changes**: Distinguish from full reschedule?

- Decision: Yes - TIME_CHANGED for direct updates, RESCHEDULED for full reschedule flow

5. **Rating**: Track updates to rating or only initial submission?

- Decision: Track initial submission only (rating updates are rare)

## Success Criteria

- All new action services follow existing patterns
- Prisma schema updated with all new enum values
- Status changes properly routed through StatusChangeAuditActionService
- Audit calls integrated at all identified update points
- Display methods work correctly in UI
- Documentation updated with all actions
- Type checks pass
- Tests pass
- Complete audit trail for all booking operations