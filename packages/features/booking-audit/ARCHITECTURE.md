# Booking Audit System - Database Architecture
Based on https://github.com/calcom/cal.com/pull/22817

## Overview

The Booking Audit System tracks all actions and changes related to bookings in Cal.com. The architecture is built around two core tables (`Actor` and `BookingAudit`) that work together to maintain a complete, immutable audit trail.

## Database Tables

### 1. Actor Table

The `Actor` table stores information about entities that perform actions on bookings. It maintains historical records even after users are deleted.

```prisma
model Actor {
  id        String    @id @default(uuid())
  type      ActorType
  
  // References for different actor types
  userId     Int?      // For USER type (nullable to allow user deletion)
  attendeeId Int?      // For ATTENDEE type
  
  // Identity fields (for GUEST types)
  email     String?
  phone     String?
  name      String?
  
  createdAt DateTime  @default(now())
  bookingAudits BookingAudit[]

  @@unique([userId])
  @@unique([attendeeId])
  @@unique([email])   // Prevent duplicate email actors
  @@unique([phone])   // Prevent duplicate phone actors
  @@index([email])
  @@index([userId])
  @@index([attendeeId])
}
```

**Key Design Decisions:**
- **UUID Primary Key**: Uses UUIDs for distributed system compatibility
- **Soft Reference to User**: `userId` is nullable to preserve audit history after user deletion
- **Unique Constraints**: Prevents duplicate actors for the same user/email/phone
- **Multiple Identity Fields**: Supports different actor types (users, guests, attendees, system)
- **Extensible System Actors**: Architecture supports multiple system actors (e.g., Cron, Webhooks, API integrations, Background Workers) for granular tracking of automated operations

---

### 2. BookingAudit Table

The `BookingAudit` table stores audit records for all booking-related actions.

```prisma
model BookingAudit {
  id        String @id @default(uuid())
  bookingId String

  // Actor who performed the action (USER, GUEST, or SYSTEM)
  // Stored in Actor table to maintain audit trail even after user deletion
  actorId String
  actor   Actor  @relation(fields: [actorId], references: [id], onDelete: Restrict)

  type   BookingAuditType
  action BookingAuditAction

  // Timestamp of the actual booking change (business event time)
  // Important: May differ from createdAt if audit is processed asynchronously
  timestamp DateTime

  // Database record timestamps
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  data Json?

  @@index([actorId])
  @@index([bookingId])
}
```

**Key Design Decisions:**
- **UUID Primary Key**: Enables time-sortable IDs (will migrate to uuid7 when Prisma 7 is available)
- **Restrict on Delete**: `onDelete: Restrict` prevents actor deletion if audit records exist
- **Required Action**: Every audit record must specify a business action, ensuring explicit tracking of what happened
- **Explicit Timestamp**: The `timestamp` field has no default and must be explicitly provided, representing when the business event actually occurred
- **Separate Database Timestamps**: `createdAt` and `updatedAt` track when the audit record itself was created/modified, distinct from the business event time
- **JSON Data Field**: Flexible schema for storing action-specific contextual data
- **Indexed Fields**: Efficient queries by `bookingId` and `actorId`


**Protecting the Audit Trail:**
- **Actor Record Deletion Prevention**: The database will reject any attempt to delete an `Actor` record that has associated `BookingAudit` records, ensuring audit records never become orphaned
- **User Deletion Unaffected**: When a `User` is deleted from the system, their corresponding `Actor` record persists (with `userId` set to null), maintaining the complete audit history



## Enums

### ActorType

Defines the type of entity performing an action:

```prisma
enum ActorType {
  USER     @map("user")     // Registered Cal.com user (stored here for audit retention even after user deletion)
  // Considering renaming it to ANONYMOUS to avoid confusion with Guest of a booking
  GUEST    @map("guest")    // Non-registered user
  ATTENDEE @map("attendee") // Guest who booked (has Attendee record)
  SYSTEM   @map("system")   // Automated actions
}
```

**Values:**
- **USER**: Registered Cal.com users who perform actions on bookings
- **GUEST**: Non-registered users (typically booking guests)
- **ATTENDEE**: Guests who have an Attendee record associated with a booking
- **SYSTEM**: Automated system actions (scheduled jobs, webhooks, etc.)

---

### BookingAuditType

Defines the category of audit record:

```prisma
enum BookingAuditType {
  RECORD_CREATED
  RECORD_UPDATED
  RECORD_DELETED
}
```

**Usage Pattern:**
- **RECORD_CREATED**: Initial booking creation
- **RECORD_UPDATED**: Any modification to existing booking (most common)
- **RECORD_DELETED**: Permanent deletion (rarely used, as bookings are typically cancelled)

---

### BookingAuditAction

Defines specific actions performed on bookings:

```prisma
enum BookingAuditAction {
  // Booking lifecycle
  CREATED       @map("created")
  
  // Status changes
  CANCELLED     @map("cancelled")
  ACCEPTED      @map("accepted")
  REJECTED      @map("rejected")
  RESCHEDULED   @map("rescheduled")

  // Attendee management
  ATTENDEE_ADDED   @map("attendee_added")
  ATTENDEE_REMOVED @map("attendee_removed")

  // Assignment/Reassignment
  REASSIGNMENT @map("reassignment")

  // Meeting details
  LOCATION_CHANGED    @map("location_changed")

  // No-show tracking
  HOST_NO_SHOW_UPDATED     @map("host_no_show_updated")
  ATTENDEE_NO_SHOW_UPDATED @map("attendee_no_show_updated")

  // Rescheduling
  RESCHEDULE_REQUESTED @map("reschedule_requested")
}
```

**Action Categories:**

1. **Booking Lifecycle**: Track creation events
   - `CREATED`

2. **Status Changes**: Track booking lifecycle transitions
   - `CANCELLED`, `ACCEPTED`, `REJECTED`, `RESCHEDULED`

3. **Attendee Management**: Track changes to booking participants
   - `ATTENDEE_ADDED`, `ATTENDEE_REMOVED`

4. **Assignment/Reassignment**: Track booking host assignment changes
   - `REASSIGNMENT`

5. **Meeting Details**: Track changes to meeting logistics
   - `LOCATION_CHANGED`

6. **No-Show Tracking**: Track attendance issues
   - `HOST_NO_SHOW_UPDATED`, `ATTENDEE_NO_SHOW_UPDATED`

7. **Rescheduling**: Track reschedule requests
   - `RESCHEDULE_REQUESTED`

---

## Schema Structure - Primary vs Secondary Changes

All audit actions follow a consistent structure for tracking changes. This structure ensures complete audit trail coverage by capturing both the old and new values for every tracked field.

### Core Pattern

```typescript
{
  primary: {
    field1,  // Each field tracks: { old: T | null, new: T }
    field2
  },
  secondary?: {  // Optional - only if side-effects exist
    field3
  }
}
```

### Field Categories

#### 1. Primary Changes
Fields that represent the **main intent or purpose** of the action. These are the core changes that define what the action is about.

**Always include old→new tracking** for each field (each field contains `{ old: T | null, new: T }`):
```typescript
primary: {
  fieldName
}
```

**Examples:**
- `LOCATION_CHANGED`: The location field is primary (that's what the action is about)
- `CANCELLED`: The cancellationReason, cancelledBy, and status are primary (the core cancellation data)
- `REASSIGNMENT`: assignedToId, assignedById, and reassignmentReason are primary (the core assignment changes)

#### 2. Secondary Changes (Optional)
Fields that serve two purposes:
1. **Side-effects**: Related fields that changed automatically when the primary action occurred
2. **Debugging context**: Additional information that helps understand what happened

Each field also contains `{ old: T | null, new: T }`.

```typescript
secondary: {
  fieldName
}
```

**Examples:**
- Side-effects: Status change (ACCEPTED → CANCELLED) when cancelling
- Side-effects: Title and userPrimaryEmail update when reassigning
- Debugging: Additional context fields that provide insight into the change

### Benefits

1. **Complete Audit Trail**: Full before/after state captured for every change
2. **Self-Contained Records**: Each record has complete context without querying previous records
3. **Clear Intent**: Primary vs secondary distinction makes the purpose explicit
4. **Better UI**: Can display clear before/after comparisons
5. **State Reconstruction**: Can rebuild booking state at any point in the audit timeline
6. **Easier Debugging**: See exact state transitions in each record

### Examples by Action

#### Simple Action (Single Primary Field)
```typescript
// LOCATION_CHANGED
{
  primary: {
    location  // { old: "Zoom", new: "Google Meet" }
  }
}
```

#### Action with Side-Effects
```typescript
// CANCELLED
{
  primary: {
    cancellationReason,  // { old: null, new: "Client requested" }
    cancelledBy,         // { old: null, new: "user@example.com" }
    status               // { old: "ACCEPTED", new: "CANCELLED" }
  },
  secondary: {
    // Could include debugging context if needed
  }
}
```

---

## JSON Data Schemas by Action

The `BookingAudit.data` field stores action-specific context. Each action has its own schema defined in a dedicated Action Helper Service using Zod validation.

### Booking Lifecycle Actions

#### CREATED
Used when a booking is initially created. Records the complete state at creation time.

```typescript
{
  startTime: string     // ISO 8601 timestamp
  endTime: string       // ISO 8601 timestamp
  status: BookingStatus // Actual booking status (any value from BookingStatus enum)
}
```

**Design Decision:** The `status` field accepts any `BookingStatus` value, not just the expected creation statuses (ACCEPTED, PENDING, AWAITING_HOST). This follows the principle of capturing reality rather than enforcing business rules in the audit layer. If a booking is ever created with an unexpected status due to a bug, we want to record that fact for debugging purposes rather than silently skip the audit record.

**Note:** The CREATED action is unique - it captures the initial booking state at creation, so it doesn't use the primary/secondary pattern with `{ old, new }` tracking. It's a flat object with just the initial values: `{ startTime, endTime, status }`.

---

### Status Change Actions

#### ACCEPTED
Used when a booking status changes to accepted.

```typescript
{
  primary: {
    status
  }
}
```

**Primary:** Status change (the main action)

#### CANCELLED
```typescript
{
  primary: {
    cancellationReason,
    cancelledBy,
    status
  }
}
```

**Primary:** Cancellation reason, who cancelled it, and status change to CANCELLED

#### REJECTED
```typescript
{
  primary: {
    rejectionReason,
    status
  }
}
```

**Primary:** Rejection reason and status change to REJECTED

#### RESCHEDULED
```typescript
{
  primary: {
    startTime,
    endTime
  }
}
```

**Primary:** Start and end time changes (the core rescheduling data)

#### RESCHEDULE_REQUESTED
```typescript
{
  primary: {
    cancellationReason,
    cancelledBy
  },
  secondary?: {
    rescheduled
  }
}
```

**Primary:** Cancellation reason (why rescheduling was requested) and who requested it (the actor)  
**Secondary:** Rescheduled flag (side-effect)

---

### Attendee Management Actions

#### ATTENDEE_ADDED
```typescript
{
  primary: {
    addedAttendees  // { old: null, new: ["email@example.com", ...] }
  }
}
```

**Primary:** Attendee(s) that were added in this action. Old value is null since we're tracking the delta, not full state.

#### ATTENDEE_REMOVED
```typescript
{
  primary: {
    removedAttendees  // { old: null, new: ["email@example.com", ...] }
  }
}
```

**Primary:** Attendee(s) that were removed in this action. Old value is null since we're tracking the delta, not full state.

---

### Assignment/Reassignment Actions

#### REASSIGNMENT
```typescript
{
  primary: {
    assignedToId,
    assignedById,
    reassignmentReason
  },
  secondary?: {
    userPrimaryEmail,
    title
  }
}
```

**Primary:** Assigned to user ID (host assignment), assigned by user ID (who performed it), and reason  
**Secondary:** User primary email and booking title (side-effects of user change)

---

### Meeting Details Actions

#### LOCATION_CHANGED
```typescript
{
  primary: {
    location
  }
}
```

**Primary:** Location change (the main action)

---

### No-Show Tracking Actions

#### HOST_NO_SHOW_UPDATED
```typescript
{
  primary: {
    noShowHost
  }
}
```

**Primary:** Host no-show status change

#### ATTENDEE_NO_SHOW_UPDATED
```typescript
{
  primary: {
    noShowAttendee
  }
}
```

**Primary:** Attendee no-show status change

---

**Important Notes:**
- Each schema is strictly typed and validated using the corresponding Action Helper Service
- Actor information is **NOT** stored in the JSON data - it's captured through the `actorId` relation linking to the `Actor` table
- All action schemas are defined in `/packages/features/booking-audit/lib/actions/`

---

### Supporting Schemas

#### Change Tracking Pattern

**As of the schema migration (2025-11-03), all changes use the `{ old, new }` pattern:**

Each field in `primary` and `secondary` objects tracks both old and new values:
```typescript
fieldName: { 
  old: T | null,  // Previous value (null if field didn't exist)
  new: T          // New value
}
```

**Benefits:**
- Complete before/after state in every record
- Self-contained audit entries (no need to query previous records)
- Clear state transitions
- Easier debugging and UI display

**Note:** The legacy `ChangeSchema` array pattern has been replaced by the primary/secondary structure with explicit `{ old, new }` tracking for each field.

---

## Table Relationships

```
Actor (1) ──────< (many) BookingAudit
   ↑
   │ (optional reference)
   ├──────────── User
   │ (optional reference)
   └──────────── Attendee
```

**Relationship Details:**

1. **Actor → BookingAudit**: One-to-Many
   - Each Actor can have multiple audit records
   - Each BookingAudit references exactly one Actor
   - `onDelete: Restrict` prevents Actor deletion if audits exist

2. **Actor → User**: Optional Many-to-One
   - `userId` is nullable to preserve audits after user deletion
   - Unique constraint ensures one Actor per User

3. **Actor → Attendee**: Optional Many-to-One
   - Links guest actors to their booking attendee records
   - `onDelete: Restrict` preserves audit trail
   - Unique constraint ensures one Actor per Attendee

---

## Indexing Strategy

### Actor Table Indexes

```prisma
@@index([email])      // Fast lookups by guest email
@@index([userId])     // Fast lookups by user ID
@@index([attendeeId]) // Fast lookups by attendee ID
```

**Query Patterns:**
- Find all actions by a user
- Find all actions by a guest email
- Find all actions by an attendee

---

### BookingAudit Table Indexes

```prisma
@@index([bookingId])  // Primary query pattern
@@index([actorId])    // Secondary query pattern
```

**Query Patterns:**
- **bookingId**: "Show me all audits for this booking" (most common)
- **actorId**: "Show me all actions by this actor"

---

## Special Actors

### SYSTEM Actor

The system actor represents automated actions and has a fixed UUID:

```typescript
const SYSTEM_ACTOR_ID = "00000000-0000-0000-0000-000000000000";
```

**Used For:**
- Automated status changes
- System-generated meeting URLs
- Scheduled operations (cron jobs)
- Webhook-triggered actions
- Any action not directly initiated by a user or guest

**Properties:**
- Type: `ActorType.SYSTEM`
- No userId, attendeeId, email, or phone
- Single instance across the entire system

---

## Schema Version Management

The audit system uses **per-action versioning** rather than global versioning. Each `BookingAuditAction` maintains its own schema version independently.

### Why Per-Action Versioning?

Different actions have different data requirements:
- `CANCELLED` needs `cancellationReason`
- `RESCHEDULED` needs new `startTime` and `endTime`
- `ATTENDEE_ADDED` needs `attendee` information
- `REASSIGNMENT` needs assignment context

When we update the schema for one action, we don't want to affect other actions.

### Implementation Approach

Each action has a dedicated Action Helper Service that defines:
1. **Schema Definition**: Zod schema specifying required/optional fields
2. **Schema Version**: Tracked per-action type (e.g., `CANCELLED_v1`, `RESCHEDULED_v1`)
3. **Validation**: Type-safe validation of audit data
4. **Display Logic**: How to render the audit record in the UI

**Example Action Services:**
- `CreatedAuditActionService` → Handles `CREATED` action
- `CancelledAuditActionService` → Handles `CANCELLED` action
- `RescheduledAuditActionService` → Handles `RESCHEDULED` action
- `ReassignmentAuditActionService` → Handles `REASSIGNMENT` action

### Benefits of Per-Action Versioning

- **Independent Evolution**: Update one action's schema without affecting others
- **Explicit Changes**: Version increments are tied to specific business operations
- **Easier Migration**: Only need to migrate records for the specific action that changed
- **Clear History**: Can track schema changes per action type over time
- **Type Safety**: Each action has a strongly-typed schema

### Version Tracking

Versions are tracked in the Action Service classes:
```typescript
// Example: When CANCELLED schema changes
CancelledAuditActionService.schema // v1
// Later, when adding a new field:
CancelledAuditActionService.schema // v2
// Other actions remain at their current version
```

---

## Design Principles

### 1. Immutability
Audit records are append-only. Once created, they are never modified or deleted. This ensures:
- Complete historical accuracy
- Tamper-proof audit trail
- Compliance with audit requirements

### 2. Historical Preservation
Actor information is preserved even after source records are deleted:
- User deletion doesn't remove Actor records
- Actor table maintains snapshot of user/guest information
- Audit trail remains complete and queryable

### 3. Flexibility
The JSON `data` field provides schema flexibility:
- Action-specific context without database schema changes
- Easy addition of new fields for future actions
- Backward compatible with versioning

### 4. Traceability
Every action is fully traceable:
- Who: Actor with type and identity
- What: Type and Action enums
- When: Explicit timestamp
- Why/How: Contextual data in JSON field

### 5. Integrity
Database constraints ensure data quality:
- Foreign key constraints prevent orphaned records
- `onDelete: Restrict` protects audit integrity
- Unique constraints prevent duplicate actors
- Indexes ensure query performance

### 6. Reality Over Enforcement
**The audit system records actual state, not expected state.**

The audit system is designed to capture what actually happened, not to enforce business rules:

- **Store Actual Values**: When recording state (e.g., booking status at creation), store the actual value from the database without validation or filtering
- **No Type Guards for State**: Avoid conditionally creating audit records based on whether the state matches expectations
- **Bug Detection**: If a booking is created with an unexpected status, record it—this becomes valuable debugging information
- **Single Source of Truth**: Let the business logic layer enforce rules; the audit layer's job is faithful recording

**Example:**
```typescript
// ❌ BAD: Enforcing expected values
if (booking.status === 'ACCEPTED' || booking.status === 'PENDING' || booking.status === 'AWAITING_HOST') {
  // Only audit if status is "expected"
  await auditService.onBookingCreated(...);
}

// ✅ GOOD: Recording actual state
await auditService.onBookingCreated(bookingId, userId, {
  startTime: booking.startTime.toISOString(),
  endTime: booking.endTime.toISOString(),
  status: booking.status  // Whatever it actually is
});
```

**Benefits:**
- Audit trail shows real system behavior, including anomalies
- Easier to debug issues (incomplete audits hide problems)
- Schemas naturally evolve with business requirements
- No silent failures where audits are skipped

**When to Validate:**
- Validate data structure (required fields, types) ✅
- Do NOT validate business logic (expected values, state transitions) ❌

---

## Service Layer

### BookingEventHandlerService - Entry Point

`BookingEventHandlerService` is the primary entry point for tracking any booking changes. It acts as a coordinator that:

1. **Receives booking events** from various parts of the application (booking creation, status changes, updates, etc.)
2. **Relays to BookingAuditService** to create audit records
3. **Handles other side effects** such as webhooks, notifications, and workflow triggers


### BookingAuditService

The audit system is accessed through `BookingAuditService`, which provides:

### Convenience Methods

- `onBookingCreated()` - Track booking creation
- `onBookingAccepted()` - Track acceptance
- `onBookingRejected()` - Track rejection
- `onBookingCancelled()` - Track cancellation
- `onBookingRescheduled()` - Track reschedule
- `onAttendeeAdded()` - Track attendee addition
- `onAttendeeRemoved()` - Track attendee removal
- `onLocationChanged()` - Track location changes
- `onHostNoShowUpdated()` - Track host no-show
- `onAttendeeNoShowUpdated()` - Track attendee no-show
- `onReassignment()` - Track booking reassignment
- `onRescheduleRequested()` - Track reschedule requests

### Actor Management

- `getOrCreateUserActor()` - Ensures User actors exist before creating audits
- Automatic Actor creation/lookup for registered users
- System actor for automated actions

---

## Summary

The Booking Audit System provides a robust, scalable architecture for tracking all booking-related actions. Key features include:

- ✅ **Complete Audit Trail**: Every action tracked with full context
- ✅ **Historical Preservation**: Data retained even after deletions
- ✅ **Flexible Schema**: JSON data supports evolution without migrations
- ✅ **Strong Integrity**: Database constraints ensure data quality
- ✅ **Performance**: Strategic indexes for common query patterns
- ✅ **Compliance Ready**: Immutable, traceable audit records
- ✅ **Reality-Based Recording**: Captures actual state, aiding in debugging and analysis

This architecture supports compliance requirements, debugging, analytics, and provides transparency for both users and administrators.

