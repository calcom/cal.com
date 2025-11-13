# Booking Audit System - Database Architecture
Based on https://github.com/calcom/cal.com/pull/22817

Note: This architecture is not in production yet, so we can make any changes we want to it without worrying about backwards compatibility.

## Overview

The Booking Audit System tracks all actions and changes related to bookings in Cal.com. The architecture is built around two core tables (`AuditActor` and `BookingAudit`) that work together to maintain a complete, immutable audit trail.

## Database Tables

### 1. AuditActor Table

The `AuditActor` table stores information about entities that perform actions on bookings. It maintains historical records even after users are deleted.

```prisma
model AuditActor {
  id        String          @id @default(uuid())
  type      AuditActorType
  
  // References for different actor types
  userId     Int?      // For USER type (nullable to allow user deletion)
  attendeeId Int?      // For ATTENDEE type
  
  // Identity fields (for GUEST types)
  email     String?
  phone     String?
  name      String?
  
  // GDPR/HIPAA Compliance fields
  pseudonymizedAt        DateTime?   // When actor data was pseudonymized for privacy
  scheduledDeletionDate  DateTime?   // When actor record should be fully anonymized after retention period
  
  createdAt DateTime  @default(now())
  bookingAudits BookingAudit[]

  @@unique([userId])
  @@unique([attendeeId])
  @@unique([email])   // Prevent duplicate email actors
  @@unique([phone])   // Prevent duplicate phone actors
  @@index([email])
  @@index([userId])
  @@index([attendeeId])
  @@index([pseudonymizedAt])  // For compliance cleanup jobs
}
```

**Key Design Decisions:**
- **UUID Primary Key**: Uses UUIDs for distributed system compatibility
- **Soft Reference to User**: `userId` is nullable to preserve audit history after user deletion
- **Unique Constraints**: Prevents duplicate audit actors for the same user/email/phone
- **Multiple Identity Fields**: Supports different actor types (users, guests, attendees, system)
- **Extensible System Actors**: Architecture supports multiple system actors (e.g., Cron, Webhooks, API integrations, Background Workers) for granular tracking of automated operations
- **Pseudonymization on Deletion**: AuditActor records are pseudonymized (PII nullified) rather than deleted to maintain HIPAA-compliant immutable audit trails. Supports compliance cleanup jobs via `pseudonymizedAt` and `scheduledDeletionDate` indices

---

### 2. BookingAudit Table

The `BookingAudit` table stores audit records for all booking-related actions.

```prisma
model BookingAudit {
  id         String @id @default(uuid())
  bookingUid String

  // Actor who performed the action (USER, GUEST, or SYSTEM)
  // Stored in AuditActor table to maintain audit trail even after user deletion
  actorId String
  actor   AuditActor  @relation(fields: [actorId], references: [id], onDelete: Restrict)

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
  @@index([bookingUid])
}
```

**Key Design Decisions:**
- **UUID Primary Key**: Enables time-sortable IDs (will migrate to uuid7 when Prisma 7 is available)
- **Restrict on Delete**: `onDelete: Restrict` prevents actor deletion if audit records exist
- **Required Action**: Every audit record must specify a business action, ensuring explicit tracking of what happened
- **Explicit Timestamp**: The `timestamp` field has no default and must be explicitly provided, representing when the business event actually occurred
- **Separate Database Timestamps**: `createdAt` and `updatedAt` track when the audit record itself was created/modified, distinct from the business event time
- **JSON Data Field**: Flexible schema for storing action-specific contextual data
- **Indexed Fields**: Efficient queries by `bookingUid` and `actorId`


**Protecting the Audit Trail:**
- **AuditActor Record Deletion Prevention**: The database will reject any attempt to delete an `AuditActor` record that has associated `BookingAudit` records, ensuring audit records never become orphaned
- **User Deletion Unaffected**: When a `User` is deleted from the system, their corresponding `AuditActor` record persists (with `userId` set to null), maintaining the complete audit history



## Enums

### AuditActorType

Defines the type of entity performing an action:

```prisma
enum AuditActorType {
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

## Schema Structure - Change Tracking

All audit actions follow a consistent structure for tracking changes. This structure ensures complete audit trail coverage by capturing both the old and new values for every tracked field.

### Core Pattern

Each action stores a flat object with all relevant fields. Each field tracks both old and new values:

```typescript
{
  field1: { old: T | null, new: T },
  field2: { old: T | null, new: T },
  field3: { old: T | null, new: T }  // Optional fields as needed
}
```

### Change Tracking

**All fields use the same pattern** - `{ old: T | null, new: T }`:
- `old`: The previous value (null if the field didn't exist before)
- `new`: The new value after the change

**Examples:**
```typescript
// Simple field changes
status: { old: "ACCEPTED", new: "CANCELLED" }
location: { old: "Zoom", new: "Google Meet" }

// New fields (old is null)
cancellationReason: { old: null, new: "Client requested" }
```

### Semantic Clarity at Application Layer

**Action Services decide what to display prominently.** Each Action Service has methods like `getDisplayDetails()` that determine:
- Which fields are most important to show by default
- Which fields should be available but not emphasized
- How to format the data for display

This keeps the data structure simple while maintaining semantic clarity where it matters - in the UI.

### Benefits

1. **Complete Audit Trail**: Full before/after state captured for every change
2. **Self-Contained Records**: Each record has complete context without querying previous records
3. **Simple Structure**: Flat object, easy to work with and extend
4. **Better UI**: Action Services decide what to emphasize based on user needs
5. **State Reconstruction**: Can rebuild booking state at any point in the audit timeline
6. **Easier Debugging**: See exact state transitions in each record
7. **Type Safety**: Zod schemas validate the structure while keeping it flexible

### Examples by Action

#### Simple Action
```typescript
// LOCATION_CHANGED
{
  location: { old: "Zoom", new: "Google Meet" }
}
```

#### Action with Multiple Fields
```typescript
// CANCELLED
{
  cancellationReason: { old: null, new: "Client requested" },
  cancelledBy: { old: null, new: "user@example.com" },
  status: { old: "ACCEPTED", new: "CANCELLED" }
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

**Note:** The CREATED action is unique - it captures the initial booking state at creation, so it doesn't use the `{ old, new }` tracking pattern. It's a flat object with just the initial values: `{ startTime, endTime, status }`.

---

### Status Change Actions

#### ACCEPTED
Used when a booking status changes to accepted.

```typescript
{
  status  // { old: "PENDING", new: "ACCEPTED" }
}
```

#### CANCELLED
```typescript
{
  cancellationReason,  // { old: null, new: "Client requested" }
  cancelledBy,         // { old: null, new: "user@example.com" }
  status               // { old: "ACCEPTED", new: "CANCELLED" }
}
```

#### REJECTED
```typescript
{
  rejectionReason,  // { old: null, new: "Does not meet requirements" }
  status            // { old: "PENDING", new: "REJECTED" }
}
```

#### RESCHEDULED
```typescript
{
  startTime,  // { old: "2024-01-15T10:00:00Z", new: "2024-01-16T14:00:00Z" }
  endTime     // { old: "2024-01-15T11:00:00Z", new: "2024-01-16T15:00:00Z" }
}
```

#### RESCHEDULE_REQUESTED
```typescript
{
  cancellationReason,  // { old: null, new: "Need to reschedule" }
  cancelledBy,         // { old: null, new: "user@example.com" }
  rescheduled?         // { old: false, new: true } - optional
}
```

---

### Attendee Management Actions

#### ATTENDEE_ADDED
```typescript
{
  addedAttendees  // { old: null, new: ["email@example.com", ...] }
}
```

Tracks attendee(s) that were added in this action. Old value is null since we're tracking the delta, not full state.

#### ATTENDEE_REMOVED
```typescript
{
  removedAttendees  // { old: null, new: ["email@example.com", ...] }
}
```

Tracks attendee(s) that were removed in this action. Old value is null since we're tracking the delta, not full state.

---

### Assignment/Reassignment Actions

#### REASSIGNMENT
```typescript
{
  assignedToId,        // { old: 123, new: 456 }
  assignedById,        // { old: 789, new: 789 }
  reassignmentReason,  // { old: null, new: "Coverage needed" }
  userPrimaryEmail?,   // { old: "old@cal.com", new: "new@cal.com" } - optional
  title?               // { old: "Meeting with A", new: "Meeting with B" } - optional
}
```

---

### Meeting Details Actions

#### LOCATION_CHANGED
```typescript
{
  location  // { old: "Zoom", new: "Google Meet" }
}
```

---

### No-Show Tracking Actions

#### HOST_NO_SHOW_UPDATED
```typescript
{
  noShowHost  // { old: false, new: true }
}
```

#### ATTENDEE_NO_SHOW_UPDATED
```typescript
{
  noShowAttendee  // { old: false, new: true }
}
```

---

**Important Notes:**
- Each schema is strictly typed and validated using the corresponding Action Helper Service
- Actor information is **NOT** stored in the JSON data - it's captured through the `actorId` relation linking to the `Actor` table
- All action schemas are defined in `/packages/features/booking-audit/lib/actions/`

---

### Supporting Schemas

#### Change Tracking Pattern

**All changes use the `{ old, new }` pattern:**

Each field tracks both old and new values:
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
- Simple flat structure that's easy to work with

---

## Table Relationships

```
AuditActor (1) ──────< (many) BookingAudit
   ↑
   │ (optional reference)
   ├──────────── User
   │ (optional reference)
   └──────────── Attendee
```

**Relationship Details:**

1. **AuditActor → BookingAudit**: One-to-Many
   - Each AuditActor can have multiple audit records
   - Each BookingAudit references exactly one AuditActor
   - `onDelete: Restrict` prevents AuditActor deletion if audits exist

2. **AuditActor → User**: Optional Many-to-One
   - `userId` is nullable to preserve audits after user deletion
   - Unique constraint ensures one AuditActor per User

3. **AuditActor → Attendee**: Optional Many-to-One
   - Links guest actors to their booking attendee records
   - `onDelete: Restrict` preserves audit trail
   - Unique constraint ensures one AuditActor per Attendee

---

## Indexing Strategy

### AuditActor Table Indexes

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

Each action has a dedicated Action Service that manages its own versioning independently. The service defines:

1. **Schema Definition**: Zod schemas for data validation
2. **Schema Version**: Each action maintains its own VERSION constant
3. **Nested Structure**: Version stored separately from audit data: `{ version, data: {} }`
4. **Type Separation**: Distinct types for input (no version) and stored format (with version)
5. **Validation**: Type-safe validation of audit data
6. **Display Logic**: How to render the audit record in the UI

**Example Action Services:**
- `CreatedAuditActionService` → Handles `CREATED` action
- `CancelledAuditActionService` → Handles `CANCELLED` action
- `RescheduledAuditActionService` → Handles `RESCHEDULED` action
- `ReassignmentAuditActionService` → Handles `REASSIGNMENT` action

### Version Storage Structure

Audit data is stored with a nested structure that separates version metadata from actual audit data:

```typescript
{
  version: 1,
  data: {
    cancellationReason: { old: null, new: "Client requested" },
    cancelledBy: { old: null, new: "user@cal.com" },
    status: { old: "ACCEPTED", new: "CANCELLED" }
  }
}
```

**Benefits of Nested Structure:**
- Clear separation between metadata (version) and actual audit data
- Makes it easy to extract just the data fields for display
- Version handling is transparent to end users
- Schema evolution is self-documenting

**Key Points:**
- Callers pass unversioned data (just the fields)
- `parse()` automatically wraps input with version before storing
- `parseStored()` validates stored data including version
- Display methods receive full stored record but only show data fields
- Type system enforces correct usage (input vs stored types)

### Benefits of Per-Action Versioning

- **Independent Evolution**: Update one action's schema without affecting others
- **Explicit Changes**: Version increments are tied to specific business operations
- **No Migration Required**: Old records handled via discriminated unions
- **Clear History**: Can track schema changes per action type over time
- **Type Safety**: Each action has strongly-typed schemas for input and storage
- **Caller Simplicity**: Callers don't need to know about versioning
- **Display Isolation**: Version handling is internal to Action Services


When adding a new version (e.g., v2 with a new field):

**Migration Steps:**
1. Create `dataSchemaV2` with new fields
2. Create `schemaV2` with `version: z.literal(2)`
3. Update `schema` to discriminated union supporting both v1 and v2
4. Update `VERSION` constant to 2
5. Update `parse()` to use v2 schema
6. Update display methods to handle both versions
7. No changes needed to callers or database

---

## Design Principles

### 1. Immutability
Audit records are append-only. Once created, they are never modified or deleted. This ensures:
- Complete historical accuracy
- Tamper-proof audit trail
- Compliance with audit requirements

### 2. Historical Preservation & Pseudonymization
Actor information is preserved even after source records are deleted:
- User deletion doesn't remove AuditActor records - they are pseudonymized instead
- AuditActor table maintains pseudonymized snapshot of user/guest information without PII
- Audit trail remains complete, queryable, and compliant with HIPAA/GDPR requirements

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

## 7. Compliance & Data Privacy

**GDPR & HIPAA Compliance:**
- **AuditActor records are NOT deleted on user deletion** - Instead, AuditActor records are pseudonymized (email/phone/name nullified) to preserve the immutable audit trail as required by HIPAA §164.312(b)
- **Cal.com's HIPAA compliance** requires audit records to remain immutable and tamper-proof. The AuditActor table design ensures BookingAudit records are never modified, only the referenced AuditActor record is pseudonymized
- **GDPR Article 17 compliance** is achieved through pseudonymization: When a user/guest requests deletion, set `userId=null`, `email=null`, `phone=null`, `name=null` on the AuditActor record, and store `pseudonymizedAt` timestamp + `scheduledDeletionDate` for compliance tracking
- **Retention Policy**: AuditActor records should be fully anonymized after 6-7 years per legal requirements

**Implementation Pattern:**
```typescript
// On user deletion: Pseudonymize, don't delete
await prisma.auditActor.update({
  where: { userId: deletedUserId },
  data: {
    userId: null,
    email: null,
    phone: null,
    name: null,
    pseudonymizedAt: new Date(),
    scheduledDeletionDate: new Date(Date.now() + 7 * 365 * 24 * 60 * 60 * 1000)
  }
});
// Result: All BookingAudit records reference pseudonymized actor - audit trail preserved, immutable
```

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
- Automatic AuditActor creation/lookup for registered users
- System actor for automated actions

### Future: Trigger.dev Task Orchestration

**Current Flow (Synchronous):**
```
Booking Endpoint → BookingEventHandler.onBookingCreated() → await auditService, linkService, webhookService
```

**Future Flow (Async with Trigger.dev):**
```
Booking Endpoint 
  ↓
BookingEventHandler.onBookingCreated() [orchestrator]
  ├─ tasks.trigger('bookingAudit', { bookingId, userId, data })
  ├─ tasks.trigger('invalidateHashedLink', { bookingId, hashedLink })
  ├─ tasks.trigger('sendNotifications', { bookingId, email, sms })
  ├─ tasks.trigger('triggerWorkflows', { bookingId, event: 'NEW_EVENT' })
  └─ Immediately returns to user (non-blocking)
  
Trigger.dev Queue
  ├─ Task: Booking Audit (with retries, monitoring)
  ├─ Task: Hashed Link Invalidation (independent)
  ├─ Task: Email & SMS Notifications (independent)
  └─ Task: Workflow Triggers (independent)
```

**Key Principles:**
- **BookingEventHandler remains the single orchestrator** - Entry point for all side effects
- **Each task is independent** - One task failure doesn't block others
- **Persistent queue** - Trigger.dev handles retries, monitoring, and observability
- **Easy to add features** - New side effect = new task definition, no BookingEventHandler complexity
- **Immutable audit records** - Booking audit is just one of many tasks, preserving the immutability principle

---

## Summary

The Booking Audit System provides a robust, scalable architecture for tracking all booking-related actions. Key features include:

- ✅ **Complete Audit Trail**: Every action tracked with full context
- ✅ **Historical Preservation**: Data retained even after deletions through pseudonymization
- ✅ **Flexible Schema**: JSON data supports evolution without migrations
- ✅ **Strong Integrity**: Database constraints ensure data quality
- ✅ **Performance**: Strategic indexes for common query patterns
- ✅ **HIPAA & GDPR Compliant**: Immutable audit records, pseudonymized actors, compliance-ready
- ✅ **Reality-Based Recording**: Captures actual state, aiding in debugging and analysis

This architecture supports compliance requirements (HIPAA §164.312(b), GDPR Article 17), debugging, analytics, and provides transparency for both users and administrators.

