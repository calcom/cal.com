# Booking Audit Schema Migration Plan

## Overview

This document tracks the migration of all booking audit action services to use a consistent `primary`/`secondary` schema structure that tracks old→new value transitions for complete audit trail coverage.

## Core Pattern

All audit actions now follow this structure:

```typescript
{
  primary: {
    field1: { old: T | null, new: T },
    field2: { old: T | null, new: T }
  },
  secondary?: {  // Optional - only if side-effects exist
    field3: { old: T | null, new: T }
  }
}
```

### Pattern Rules

1. **Primary fields** = Main intent/purpose of the action (the core change)
2. **Secondary fields** = Side-effects of the primary action (related changes)
3. **Context fields** = Metadata that doesn't change (e.g., assignmentMethod, assignmentDetails)
4. **All tracked fields** use `{ old, new }` structure for complete audit trail

## Implementation Status

### ✅ Phase 1: Schema Restructuring (COMPLETED)

All 11 action services have been updated:

#### 1.1 Simple Conversions (3 services)
Already had old/new tracking, just renamed `changes` → `primary`:

- ✅ **LocationChangedAuditActionService**
  ```typescript
  // Before: { changes: { location: { old, new } } }
  // After:  { primary: { location: { old, new } } }
  ```

- ✅ **HostNoShowUpdatedAuditActionService**
  ```typescript
  // Before: { changes: { noShowHost: { old, new } } }
  // After:  { primary: { noShowHost: { old, new } } }
  ```

- ✅ **AttendeeNoShowUpdatedAuditActionService**
  ```typescript
  // Before: { changes: { noShowAttendee: { old, new } } }
  // After:  { primary: { noShowAttendee: { old, new } } }
  ```

#### 1.2 Add Old Value Tracking (3 services)
Previously only tracked new values, now track old→new:

- ✅ **RescheduledAuditActionService**
  ```typescript
  // Before: { startTime: string, endTime: string }
  // After:  { 
  //   primary: { 
  //     startTime: { old: string | null, new: string },
  //     endTime: { old: string | null, new: string }
  //   }
  // }
  ```

- ✅ **CancelledAuditActionService**
  ```typescript
  // Before: { cancellationReason: string }
  // After:  { 
  //   primary: { 
  //     cancellationReason: { old: string | null, new: string | null },
  //     cancelledBy: { old: string | null, new: string | null }
  //   },
  //   secondary: {
  //     status: { old: string | null, new: string }
  //   }
  // }
  ```

- ✅ **RejectedAuditActionService**
  ```typescript
  // Before: { rejectionReason: string }
  // After:  { 
  //   primary: { 
  //     rejectionReason: { old: string | null, new: string }
  //   },
  //   secondary: {
  //     status: { old: string | null, new: string }
  //   }
  // }
  ```

#### 1.3 Major Restructuring (5 services)
Complex changes splitting into primary/secondary:

- ✅ **StatusChangeAuditActionService**
  ```typescript
  // Before: { changes: { status: {...}, references: {...} } }
  // After:  { 
  //   primary: { status: { old, new } },
  //   secondary: { references: { old, new } }
  // }
  ```

- ✅ **AttendeeAddedAuditActionService**
  ```typescript
  // Before: { addedGuests: string[], changes: { attendees: { old, new } } }
  // After:  { primary: { attendees: { old, new } } }
  // Added helper: getAddedGuests() to extract delta
  ```

- ✅ **AttendeeRemovedAuditActionService**
  ```typescript
  // Before: { changes: { attendees: { old, new } } }
  // After:  { primary: { attendees: { old, new } } }
  // Added helper: getRemovedGuests() to extract delta
  ```

- ✅ **RescheduleRequestedAuditActionService**
  ```typescript
  // Before: { 
  //   cancellationReason?: string,
  //   changes: { rescheduled: {...}, cancelledBy: {...} }
  // }
  // After:  { 
  //   primary: { 
  //     cancellationReason: { old: string | null, new: string | null },
  //     cancelledBy: { old: string | null, new: string | null }
  //   },
  //   secondary: { rescheduled: { old: boolean | null, new: boolean } }
  // }
  ```

- ✅ **ReassignmentAuditActionService**
  ```typescript
  // Before: { 
  //   reassignmentReason: string,
  //   assignmentMethod: enum,
  //   assignmentDetails: {...},
  //   changes: { userId: {...}, email: {...}, title: {...} }
  // }
  // After:  { 
  //   primary: { 
  //     userId: { old, new },
  //     email: { old, new },
  //     reassignmentReason: { old, new }
  //   },
  //   secondary: { 
  //     userPrimaryEmail: { old, new },
  //     title: { old, new }
  //   },
  //   assignmentMethod: enum,  // Context field
  //   assignmentDetails: {...}  // Context field
  // }
  ```

#### 1.4 No Changes Required (1 service)
- ✅ **CreatedAuditActionService** - Creation has no old values (correct as-is)

### ✅ Phase 2: Integration Points (PARTIALLY COMPLETED)

Updated 8 files that call audit services:

#### 2.1 Completed Updates

1. ✅ **handleCancelBooking.ts** (line 484-510)
   ```typescript
   await bookingEventHandlerService.onBookingCancelled(bookingId, actor, {
     primary: {
       cancellationReason: {
         old: bookingToDelete.cancellationReason,
         new: cancellationReason ?? null,
       },
       cancelledBy: {
         old: bookingToDelete.cancelledBy,
         new: cancelledBy ?? null,
       },
     },
     secondary: {
       status: {
         old: bookingToDelete.status,
         new: "CANCELLED",
       },
     },
   });
   ```
   ✅ **Completed**: Added `cancellationReason` and `cancelledBy` to bookingToDelete query select

2. ✅ **handleConfirmation.ts** (line 321-338)
   ```typescript
   const auditData: StatusChangeAuditData = {
     primary: {
       status: {
         old: booking.status,
         new: BookingStatus.ACCEPTED,
       },
     },
   };
   await bookingEventHandlerService.onBookingAccepted(bookingId, actor, auditData);
   ```
   ⚠️ **Remaining**: Add `status` to booking query select

3. ✅ **BookingEventHandlerService.ts** (line 155-187)
   ```typescript
   // Updated type guards to check for primary field structure
   const statusData: StatusChangeAuditData | undefined =
     data && 'primary' in data && 'status' in data.primary ? data : undefined;
   ```
   ⚠️ **Remaining**: Refine type guard logic for better discrimination

4. ✅ **roundRobinManualReassignment.ts** (line 228-257)
   ```typescript
   const auditData: ReassignmentAuditData = {
     primary: {
       userId: { old: oldUserId?.toString() || null, new: newUserId.toString() },
       email: { old: oldEmail || null, new: newUser.email },
       reassignmentReason: { old: null, new: reassignReason || "Manual..." },
     },
     assignmentMethod: "manual",
     assignmentDetails: { ... },
   };
   ```

5. ✅ **roundRobinReassignment.ts** (line 276-307)
   - Similar structure to manual reassignment

6. ✅ **handleMarkNoShow.ts** (line 341-349, 376-388)
   ```typescript
   // Attendee no-show
   await bookingEventHandlerService.onAttendeeNoShowUpdated(bookingId, actor, {
     primary: { noShowAttendee: { old: anyOldNoShow, new: anyNewNoShow } },
   });
   
   // Host no-show
   await bookingEventHandlerService.onHostNoShowUpdated(bookingId, actor, {
     primary: { noShowHost: { old: bookingToUpdate.noShowHost, new: true } },
   });
   ```

7. ✅ **editLocation.handler.ts** (line 302-314)
   ```typescript
   await bookingEventHandlerService.onLocationChanged(bookingId, actor, {
     primary: { location: { old: oldLocation, new: newLocationInEvtFormat } },
   });
   ```

8. ✅ **requestReschedule.handler.ts** (line 163-190)
   ```typescript
   const auditData: RescheduleRequestedAuditData = {
     primary: {
       cancellationReason: {
         old: bookingToReschedule.cancellationReason,
         new: cancellationReason ?? null,
       },
       cancelledBy: {
         old: bookingToReschedule.cancelledBy,
         new: user.email,
       },
     },
     secondary: {
       rescheduled: {
         old: bookingToReschedule.rescheduled ?? false,
         new: true,
       },
     },
   };
   ```
   ✅ **Completed**: Added `cancellationReason`, `rescheduled`, and `cancelledBy` to booking query select

### ✅ Phase 3: Type Error Fixes (COMPLETED)

All 6 type errors have been resolved:

#### 3.1 Missing Query Fields (2 errors) - FIXED ✅

**Error 1: handleCancelBooking.ts:492** - FIXED
```typescript
// Added cancellationReason to getBookingToDelete query
// File: packages/features/bookings/lib/getBookingToDelete.ts:106
cancellationReason: true,
```

**Error 2: handleConfirmation.ts:326** - FIXED
```typescript
// Added status field to booking parameter type
// File: packages/features/bookings/lib/handleConfirmation.ts:49
status: BookingStatus;
```

#### 3.2 Type Guard Issues (3 errors) - FIXED ✅

**Errors: BookingEventHandlerService.ts:161, 169, 176** - FIXED

Created proper type guard functions with type predicates:
```typescript
function isStatusChangeAuditData(
  data: StatusChangeAuditData | CancelledAuditData | RejectedAuditData | undefined
): data is StatusChangeAuditData {
  return data !== undefined && "primary" in data && "status" in data.primary;
}

function isCancelledAuditData(
  data: StatusChangeAuditData | CancelledAuditData | RejectedAuditData | undefined
): data is CancelledAuditData {
  return data !== undefined && "primary" in data && "cancellationReason" in data.primary;
}

function isRejectedAuditData(
  data: StatusChangeAuditData | CancelledAuditData | RejectedAuditData | undefined
): data is RejectedAuditData {
  return data !== undefined && "primary" in data && "rejectionReason" in data.primary;
}
```

Updated method to use type guards properly for correct type narrowing.

#### 3.3 Undefined Handling (1 error) - FIXED ✅

**Error: requestReschedule.handler.ts:164** - FIXED
```typescript
// Added default empty string for optional cancellationReason
cancellationReason: { old: null, new: cancellationReason || "" }
```

### ✅ Phase 4: Documentation (COMPLETED)

Updated `ARCHITECTURE.md` with comprehensive documentation:

#### 4.1 Added New Section ✅

- **"Schema Structure - Primary vs Secondary Changes"** section added (lines 197-314)
- Explains core pattern, field categories (primary/secondary/context)
- Lists all benefits of the new structure
- Includes detailed examples for simple, complex, and context-based actions

#### 4.2 Updated Existing Sections ✅

- **ACCEPTED**: Updated to show primary: { status }, secondary: { references }
- **CANCELLED**: Updated to show primary: { cancellationReason }, secondary: { status }
- **REJECTED**: Updated to show primary: { rejectionReason }, secondary: { status }
- **RESCHEDULED**: Updated to show primary: { startTime, endTime } with old/new tracking
- **RESCHEDULE_REQUESTED**: Updated to show primary/secondary structure
- **ATTENDEE_ADDED/REMOVED**: Updated to show primary: { attendees } with helper methods
- **REASSIGNMENT**: Updated to show primary/secondary/context structure
- **LOCATION_CHANGED**: Updated to show primary: { location }
- **HOST_NO_SHOW_UPDATED**: Updated to show primary: { noShowHost }
- **ATTENDEE_NO_SHOW_UPDATED**: Updated to show primary: { noShowAttendee }
- **Change Tracking Pattern**: Replaced legacy ChangeSchema with new { old, new } pattern

## Benefits Achieved

1. ✅ **Complete Audit Trail** - Full before/after state captured for every change
2. ✅ **Consistency** - All services follow identical primary/secondary structure  
3. ✅ **Self-Contained** - Each record has complete context without querying previous records
4. ✅ **Clear Intent** - Primary vs secondary distinction makes purpose explicit
5. ✅ **Type Safety** - Zod validation enforces old/new structure everywhere
6. ✅ **Better UI** - Can display clear before/after comparisons
7. ✅ **Easier Debugging** - See exact state transitions in each record
8. ✅ **Reconstruction** - Can rebuild state at any point in audit timeline

## Migration Checklist

### Completed ✅
- [x] Update all 11 action service schemas
- [x] Update all getDisplayDetails methods
- [x] Update 8 integration point files
- [x] Verify type exports in lib/types/index.ts
- [x] Check for linter errors (none found)

### Remaining ✅
- [x] Fix bookingToDelete query in handleCancelBooking.ts
- [x] Fix booking query in handleConfirmation.ts  
- [x] Refine type guards in BookingEventHandlerService.ts
- [x] Update ARCHITECTURE.md documentation
- [x] Run final type-check to verify all errors resolved

## Files Modified

### Action Services (11 files)
1. `lib/actions/LocationChangedAuditActionService.ts`
2. `lib/actions/HostNoShowUpdatedAuditActionService.ts`
3. `lib/actions/AttendeeNoShowUpdatedAuditActionService.ts`
4. `lib/actions/RescheduledAuditActionService.ts`
5. `lib/actions/CancelledAuditActionService.ts`
6. `lib/actions/RejectedAuditActionService.ts`
7. `lib/actions/StatusChangeAuditActionService.ts`
8. `lib/actions/AttendeeAddedAuditActionService.ts`
9. `lib/actions/AttendeeRemovedAuditActionService.ts`
10. `lib/actions/RescheduleRequestedAuditActionService.ts`
11. `lib/actions/ReassignmentAuditActionService.ts`

### Integration Points (8 files)
12. `packages/features/bookings/lib/handleCancelBooking.ts`
13. `packages/features/bookings/lib/handleConfirmation.ts`
14. `packages/features/bookings/lib/onBookingEvents/BookingEventHandlerService.ts`
15. `packages/features/ee/round-robin/roundRobinManualReassignment.ts`
16. `packages/features/ee/round-robin/roundRobinReassignment.ts`
17. `packages/features/handleMarkNoShow.ts`
18. `packages/trpc/server/routers/viewer/bookings/editLocation.handler.ts`
19. `packages/trpc/server/routers/viewer/bookings/requestReschedule.handler.ts`

## Next Steps ✅ ALL COMPLETED

1. ✅ **Fix Database Queries**
   - ✅ Added `cancellationReason` to bookingToDelete query (getBookingToDelete.ts:106)
   - ✅ Added `status` to booking parameter type in handleConfirmation (handleConfirmation.ts:49)

2. ✅ **Fix Type Guards**
   - ✅ Created proper type guard functions with type predicates
   - ✅ Updated onBookingStatusChange to use discriminated union properly
   - ✅ All 3 type guard errors resolved

3. ✅ **Complete Documentation**
   - ✅ Added comprehensive "Schema Structure - Primary vs Secondary Changes" section
   - ✅ Updated all 11 action schema documentation with new structures
   - ✅ Added examples and benefits

4. ✅ **Final Verification**
   - ✅ Ran `yarn type-check` in apps/web - **PASSED (0 errors)**
   - ✅ All type errors resolved
   - ✅ No `any` types introduced

## Notes

- **Common schemas decision**: Decided against creating shared schema helpers (StringChangeSchema, etc.) to keep each service self-contained
- **Old values availability**: Analysis confirmed old values ARE already fetched in most booking flows but weren't being passed to audit services
- **No breaking changes**: These audit actions are not yet fully integrated into production booking flows, so schema changes are safe
- **Type system enforcement**: Zod validation ensures all callers must provide old/new structure

---

**Status**: ✅ 100% COMPLETE | **Last Updated**: 2025-11-03 | **Completed By**: AI Assistant

