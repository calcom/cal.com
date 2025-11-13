# Booking Audit System - Foundation Branch & Integration Plan

## Overview

This document describes the foundation branch for the Booking Audit System and provides a structured plan for integrating it into the codebase through small, stackable PRs.

The foundation branch (`refactor-audit-abstraction-k7vXx`) contains the complete skeleton of the audit system without any integration into existing booking flows. This allows for:
- Independent testing of the audit infrastructure
- Gradual, reviewable integration through small PRs
- Clear separation between infrastructure and integration concerns

---

## Foundation Branch Contents

### Commit: `c53b31ff17`
**Message:** feat: Booking Audit System foundation (skeleton without integration)

### What's Included

#### 1. Database Schema (`packages/prisma/schema.prisma`)

**Models:**
- `Actor` - Tracks entities that perform actions on bookings
  - Fields: id, type, userId, attendeeId, email, phone, name, createdAt
  - Unique constraints on userId, attendeeId, email, phone
  - Indexes on email, userId, attendeeId

- `BookingAudit` - Stores audit records for booking actions
  - Fields: id, bookingId, actorId, type, action, timestamp, createdAt, updatedAt, data (JSON)
  - Foreign key to Actor with onDelete: Restrict
  - Indexes on bookingId, actorId

**Enums:**
- `ActorType` - USER, GUEST, ATTENDEE, SYSTEM
- `BookingAuditType` - RECORD_CREATED, RECORD_UPDATED, RECORD_DELETED
- `BookingAuditAction` - 18 actions covering booking lifecycle:
  - Lifecycle: CREATED
  - Status Changes: CANCELLED, ACCEPTED, REJECTED, PENDING, AWAITING_HOST, RESCHEDULED
  - Attendee Management: ATTENDEE_ADDED, ATTENDEE_REMOVED
  - Reason Updates: CANCELLATION_REASON_UPDATED, REJECTION_REASON_UPDATED, ASSIGNMENT_REASON_UPDATED, REASSIGNMENT_REASON_UPDATED
  - Meeting Details: LOCATION_CHANGED, MEETING_URL_UPDATED
  - No-Show Tracking: HOST_NO_SHOW_UPDATED, ATTENDEE_NO_SHOW_UPDATED
  - Rescheduling: RESCHEDULE_REQUESTED

#### 2. Repository Layer (`packages/features/booking-audit/lib/repository/`)

**Interfaces:**
- `IActorRepository` - Actor operations (findByUserId, upsertUserActor, getSystemActor)
- `IBookingAuditRepository` - Audit operations (create)

**Implementations:**
- `PrismaActorRepository` - Prisma-based actor repository
- `PrismaBookingAuditRepository` - Prisma-based audit repository with validation

#### 3. Service Layer (`packages/features/booking-audit/lib/service/`)

**BookingAuditService:**
- Main service class with dependency injection
- Constants: SYSTEM_ACTOR_ID, CURRENT_AUDIT_DATA_VERSION
- Private methods: getOrCreateUserActor(), createAuditRecord()
- Public audit methods (18 total):
  - `onBookingCreated()`
  - `onBookingAccepted()`
  - `onBookingRejected()`
  - `onBookingPending()`
  - `onBookingAwaitingHost()`
  - `onBookingCancelled()`
  - `onBookingRescheduled()`
  - `onRescheduleRequested()`
  - `onAttendeeAdded()`
  - `onAttendeeRemoved()`
  - `onCancellationReasonUpdated()`
  - `onRejectionReasonUpdated()`
  - `onAssignmentReasonUpdated()`
  - `onReassignmentReasonUpdated()`
  - `onLocationChanged()`
  - `onMeetingUrlUpdated()`
  - `onHostNoShowUpdated()`
  - `onAttendeeNoShowUpdated()`
  - `onSystemAction()` (generic method for automated actions)
- Display methods:
  - `getDisplaySummary()` - Human-readable summary
  - `getDisplayDetails()` - Detailed key-value pairs for UI

#### 4. Action Services (`packages/features/booking-audit/lib/actions/`)

Each action has a dedicated service class with:
- Static Zod schema for validation
- `parse()` method for data validation
- `getDisplaySummary()` method for i18n-aware display
- `getDisplayDetails()` method for detailed UI display
- Exported TypeScript type

**Action Services:**
- `CreatedAuditActionService`
- `CancelledAuditActionService`
- `RejectedAuditActionService`
- `RescheduledAuditActionService`
- `RescheduleRequestedAuditActionService`
- `AttendeeAddedAuditActionService`
- `AttendeeRemovedAuditActionService`
- `AssignmentAuditActionService`
- `ReassignmentAuditActionService`
- `CancellationReasonUpdatedAuditActionService`
- `RejectionReasonUpdatedAuditActionService`
- `LocationChangedAuditActionService`
- `MeetingUrlUpdatedAuditActionService`
- `HostNoShowUpdatedAuditActionService`
- `AttendeeNoShowUpdatedAuditActionService`
- `StatusChangeAuditActionService`

#### 5. Common Schemas (`packages/features/booking-audit/lib/common/schemas.ts`)

- `ChangeSchema` - Tracks field-level changes (field, oldValue, newValue)
- `AssignmentDetailsSchema` - Assignment context (teamId, teamName, assignedUser, previousUser)

#### 6. Type Definitions (`packages/features/booking-audit/lib/types/index.ts`)

- Union schema for all audit data types
- Re-exports of all Action Service types
- Comprehensive TypeScript types for type safety

#### 7. Documentation

- `ARCHITECTURE.md` - Complete database architecture documentation
- `FOUNDATION-AND-INTEGRATION-PLAN.md` - This file

---

## What's NOT Included (By Design)

The foundation branch intentionally **excludes integration code** to keep it focused and reviewable. The following files remain unchanged from their pre-audit state:

- `packages/features/bookings/lib/service/RegularBookingService.ts`
- `packages/features/bookings/lib/handleConfirmation.ts`
- `packages/features/bookings/lib/onBookingEvents/BookingEventHandlerService.ts`
- `packages/features/ee/round-robin/roundRobinManualReassignment.ts`
- `packages/trpc/server/routers/viewer/bookings/addGuests.handler.ts`
- `packages/trpc/server/routers/viewer/bookings/requestReschedule.handler.ts`
- Any other booking-related files

---

## Integration Strategy: Stackable PRs

The audit system will be integrated through small, focused PRs that stack on top of the foundation branch. Each PR should:
1. Be independently reviewable
2. Focus on a single booking operation or feature area
3. Include tests for the integration
4. Be small enough to review in 15-30 minutes

### Suggested PR Sequence

#### Phase 1: Core Booking Operations

**PR 1: Booking Creation Audit**
- **Files to modify:** `RegularBookingService.ts`
- **Scope:** Add audit call in booking creation flow
- **Action:** `onBookingCreated()`
- **Data Required:** startTime, endTime, status

**PR 2: Booking Cancellation Audit**
- **Files to modify:** `handleCancelBooking.ts`, cancellation handlers
- **Scope:** Add audit call in cancellation flow
- **Action:** `onBookingCancelled()`
- **Data Required:** cancellationReason

**PR 3: Booking Confirmation/Acceptance Audit**
- **Files to modify:** `handleConfirmation.ts`
- **Scope:** Add audit call when booking is accepted
- **Action:** `onBookingAccepted()`
- **Data Required:** changes (optional)

**PR 4: Booking Rejection Audit**
- **Files to modify:** Rejection handlers
- **Scope:** Add audit call when booking is rejected
- **Action:** `onBookingRejected()`
- **Data Required:** rejectionReason

**PR 5: Booking Rescheduling Audit**
- **Files to modify:** Reschedule handlers
- **Scope:** Add audit call when booking is rescheduled
- **Actions:** `onBookingRescheduled()`, `onRescheduleRequested()`
- **Data Required:** new startTime, endTime

#### Phase 2: Attendee Management

**PR 6: Guest Addition Audit**
- **Files to modify:** `addGuests.handler.ts`
- **Scope:** Add audit call when guests are added
- **Action:** `onAttendeeAdded()`
- **Data Required:** addedGuests array, changes

**PR 7: Guest Removal Audit**
- **Files to modify:** Guest removal handlers
- **Scope:** Add audit call when guests are removed
- **Action:** `onAttendeeRemoved()`
- **Data Required:** changes

#### Phase 3: Round-Robin & Assignment

**PR 8: Manual Reassignment Audit**
- **Files to modify:** `roundRobinManualReassignment.ts`
- **Scope:** Add audit call when bookings are manually reassigned
- **Action:** `onReassignmentReasonUpdated()`
- **Data Required:** reassignmentReason, assignmentMethod, assignmentDetails

**PR 9: Automatic Assignment Audit**
- **Files to modify:** Round-robin assignment logic
- **Scope:** Add audit call for automatic assignments
- **Action:** `onAssignmentReasonUpdated()`
- **Data Required:** assignmentMethod, assignmentDetails

#### Phase 4: Meeting Details

**PR 10: Location Change Audit**
- **Files to modify:** Location update handlers
- **Scope:** Add audit call when meeting location changes
- **Action:** `onLocationChanged()`
- **Data Required:** changes

**PR 11: Meeting URL Update Audit**
- **Files to modify:** Meeting URL update handlers
- **Scope:** Add audit call when meeting URL is updated
- **Action:** `onMeetingUrlUpdated()`
- **Data Required:** changes

#### Phase 5: No-Show Tracking

**PR 12: Host No-Show Audit**
- **Files to modify:** No-show tracking handlers
- **Scope:** Add audit call when host no-show is recorded
- **Action:** `onHostNoShowUpdated()`
- **Data Required:** changes

**PR 13: Attendee No-Show Audit**
- **Files to modify:** No-show tracking handlers
- **Scope:** Add audit call when attendee no-show is recorded
- **Action:** `onAttendeeNoShowUpdated()`
- **Data Required:** changes

#### Phase 6: Reason Updates

**PR 14: Cancellation Reason Update Audit**
- **Files to modify:** Cancellation reason update handlers
- **Scope:** Add audit call when cancellation reason is modified
- **Action:** `onCancellationReasonUpdated()`
- **Data Required:** cancellationReason

**PR 15: Rejection Reason Update Audit**
- **Files to modify:** Rejection reason update handlers
- **Scope:** Add audit call when rejection reason is modified
- **Action:** `onRejectionReasonUpdated()`
- **Data Required:** rejectionReason

---

## PR Template

Use this template for each integration PR:

### PR Title
```
feat(audit): Add audit logging for [specific operation]
```

### PR Description
```
## Overview
Integrates audit logging for [specific operation] as part of the Booking Audit System rollout.

## Changes
- Modified: [list files]
- Added audit call: `BookingAuditService.[methodName]()`
- Action tracked: [action name]

## Integration Point
[Brief description of where in the flow the audit is called]

## Data Captured
[List the fields captured in the audit data]

## Testing
- [ ] Manual testing of [operation]
- [ ] Verified audit record created in database
- [ ] Verified audit data matches schema
- [ ] Type-check passes
- [ ] Linter passes

## Stacked On
- Foundation Branch: `refactor-audit-abstraction-k7vXx` (commit: c53b31ff17)
- Previous PR: [if applicable]

## Next PR
[What integration comes next]
```

---

## Development Guidelines

### When Adding Audit Calls

1. **Identify the business event**
   - What action occurred? (created, cancelled, rescheduled, etc.)
   - Who performed it? (userId for user actions, undefined for system)
   - When did it happen? (use current timestamp via BookingAuditService)

2. **Determine the actor**
   ```typescript
   // For user actions
   const userId = currentUser.id;
   
   // For system actions
   const userId = undefined; // Service will use SYSTEM_ACTOR_ID
   ```

3. **Prepare the audit data**
   ```typescript
   import type { [ActionName]AuditData } from "@calcom/features/booking-audit/lib/actions/[ActionName]AuditActionService";
   
   const auditData: [ActionName]AuditData = {
     // Follow the schema defined in the corresponding Action Service
   };
   ```

4. **Call the audit service**
   ```typescript
   import { BookingAuditService } from "@calcom/features/booking-audit/lib/service/BookingAuditService";
   
   const bookingAuditService = BookingAuditService.create();
   await bookingAuditService.on[ActionName](
     bookingId,
     userId,
     auditData
   );
   ```

5. **Handle errors gracefully**
   ```typescript
   try {
     await bookingAuditService.on[ActionName](...);
   } catch (error) {
     // Log but don't fail the main operation
     logger.error("Failed to create audit record", error);
   }
   ```

### Testing Integration

For each PR, test:
1. **Audit record creation**
   - Verify record appears in `BookingAudit` table
   - Check `actorId` links to correct `Actor`
   - Verify `data` field contains expected JSON

2. **Data validation**
   - Zod schema validation passes
   - Required fields are present
   - Optional fields handled correctly

3. **Type safety**
   - TypeScript compilation succeeds
   - No `any` types introduced
   - Proper type imports used

4. **Error handling**
   - Audit failures don't break main flow
   - Errors are logged appropriately

---

## Common Patterns

### Pattern 1: User-Initiated Action
```typescript
const bookingAuditService = BookingAuditService.create();

await bookingAuditService.onBookingCancelled(
  booking.id,
  req.userId, // Current user performing the action
  {
    cancellationReason: input.cancellationReason,
  }
);
```

### Pattern 2: System-Initiated Action
```typescript
const bookingAuditService = BookingAuditService.create();

await bookingAuditService.onBookingCreated(
  booking.id,
  undefined, // System action
  {
    startTime: booking.startTime.toISOString(),
    endTime: booking.endTime.toISOString(),
    status: booking.status,
  }
);
```

### Pattern 3: With Change Tracking
```typescript
import type { StatusChangeAuditData } from "@calcom/features/booking-audit/lib/actions/StatusChangeAuditActionService";

const changes = [
  { field: "status", oldValue: "PENDING", newValue: "ACCEPTED" },
  { field: "references", oldValue: null, newValue: references },
];

const auditData: StatusChangeAuditData = { changes };

await bookingAuditService.onBookingAccepted(
  booking.id,
  req.userId,
  auditData
);
```

### Pattern 4: With Assignment Context
```typescript
import type { ReassignmentAuditData } from "@calcom/features/booking-audit/lib/actions/ReassignmentAuditActionService";

const auditData: ReassignmentAuditData = {
  reassignmentReason: "Manual reassignment by admin",
  assignmentMethod: "manual",
  assignmentDetails: {
    teamId: team.id,
    teamName: team.name,
    assignedUser: {
      id: newHost.id,
      name: newHost.name,
      email: newHost.email,
    },
    previousUser: {
      id: oldHost.id,
      name: oldHost.name,
      email: oldHost.email,
    },
  },
  changes: [
    { field: "userId", oldValue: oldHost.id, newValue: newHost.id },
  ],
};

await bookingAuditService.onReassignmentReasonUpdated(
  booking.id,
  req.userId,
  auditData
);
```

---

## Troubleshooting

### Issue: "Actor not found"
**Cause:** User was deleted but Actor record doesn't exist  
**Solution:** Actor records are created on-demand via `upsertUserActor()`

### Issue: "Zod validation failed"
**Cause:** Audit data doesn't match the schema  
**Solution:** Check the Action Service schema definition and ensure all required fields are present

### Issue: "Cannot delete Actor"
**Cause:** Attempting to delete Actor with existing BookingAudit records  
**Solution:** This is intentional (onDelete: Restrict). Actors should never be deleted.

### Issue: "Type errors in integration code"
**Cause:** Incorrect type imports or data structure  
**Solution:** Import types directly from their respective action service files (e.g., `@calcom/features/booking-audit/lib/actions/StatusChangeAuditActionService`) and follow the schemas

---

## Branch Management

### Main Branches
- **Foundation:** `refactor-audit-abstraction-k7vXx` (commit: c53b31ff17)
- **Base for PRs:** All integration PRs should branch from the foundation branch

### Workflow
```bash
# Create a new integration PR branch
git checkout refactor-audit-abstraction-k7vXx
git pull origin refactor-audit-abstraction-k7vXx
git checkout -b feat/audit-booking-creation

# Make changes, commit, and push
git add .
git commit -m "feat(audit): Add audit logging for booking creation"
git push origin feat/audit-booking-creation

# Create PR targeting the foundation branch
# After merge, next PR branches from updated foundation branch
```

### Stacking PRs
1. PR 1 targets foundation branch
2. After PR 1 merges, foundation branch is updated
3. PR 2 branches from updated foundation
4. Repeat...

---

## Success Criteria

Each integration PR should satisfy:
- ✅ Audit record created successfully
- ✅ Correct actor identified
- ✅ Data validated by Zod schema
- ✅ Type-check passes
- ✅ Linter passes
- ✅ Tests pass (if applicable)
- ✅ No breaking changes to existing functionality
- ✅ Error handling doesn't break main flow
- ✅ Code review completed

---

## References

- **Architecture Documentation:** `ARCHITECTURE.md` - Complete database and design documentation
- **Foundation Commit:** `c53b31ff17` - Initial skeleton implementation
- **PR Tracking:** Track progress through GitHub PRs targeting the foundation branch

---

## Maintenance

This document should be updated when:
- New audit actions are added
- Integration patterns change
- PR sequence needs adjustment
- New testing requirements emerge

**Last Updated:** 2025-11-01  
**Foundation Commit:** c53b31ff17  
**Status:** Foundation complete, integration PRs pending

