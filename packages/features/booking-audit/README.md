# Booking Audit System

Based on https://github.com/calcom/cal.com/pull/22817

Note: This architecture is not in production yet, so we can make any changes we want to it without worrying about backwards compatibility.

## Overview

The Booking Audit System tracks all actions and changes related to bookings in Cal.com. The architecture is built around two core tables (`AuditActor` and `BookingAudit`) that work together to maintain a complete, immutable audit trail.

## Database Architecture

### Core Tables

1. **AuditActor**: Stores information about entities that perform actions on bookings. Maintains historical records even after users are deleted.
2. **BookingAudit**: Stores audit records for all booking-related actions.

### Key Design Decisions

**AuditActor Table:**
- Uses UUID primary keys for distributed system compatibility
- Soft references to `User` (via `userUuid`) and `Attendee` (via `attendeeId`) without foreign key constraints
- Allows audit trail to persist independently even after users/attendees are deleted
- Uses `User.uuid` instead of `User.id` for stable identification across distributed systems
- Unique constraints prevent duplicate audit actors
- Supports multiple actor types: USER, GUEST, ATTENDEE, SYSTEM
- Identity fields (email, phone, name) can be anonymized when source records are deleted to preserve audit trail while removing PII

**BookingAudit Table:**
- Uses UUID v7 primary keys for time-sortable IDs
- `bookingUid` stored as plain string (no foreign key) to preserve audit trail after booking deletion
- `onDelete: Restrict` prevents actor deletion if audit records exist
- Explicit `timestamp` field represents business event time (may differ from `createdAt` if processed asynchronously)
- JSON `data` field stores action-specific contextual data
- Indexed for efficient queries by `bookingUid`, `actorId`, and `timestamp`

**Protecting the Audit Trail:**
- Database rejects deletion of `AuditActor` records that have associated `BookingAudit` records
- When a `User` is deleted, their `AuditActor` record persists with `userUuid` set to null, maintaining complete audit history

## Actor Types

- **USER**: Registered Cal.com users
- **GUEST**: Non-registered users (typically booking guests)
- **ATTENDEE**: Guests who have an Attendee record associated with a booking
- **SYSTEM**: Automated system actions (scheduled jobs, webhooks, etc.)

## Audit Record Types

- **RECORD_CREATED**: Initial booking creation
- **RECORD_UPDATED**: Any modification to existing booking (most common)
- **RECORD_DELETED**: Permanent deletion (rarely used, as bookings are typically cancelled)

## Data Structure Pattern

All audit actions follow a consistent structure for tracking changes:
- Each field tracks both old and new values: `{ old: T | null, new: T }`
- `old`: Previous value (null if field didn't exist before)
- `new`: New value after the change
- Action Services decide what to display prominently in the UI
- Complete before/after state captured in every record

**Exception:** The CREATED action captures initial booking state at creation, so it uses a flat object with initial values rather than the `{ old, new }` pattern.

## Schema Versioning

The audit system uses **per-action versioning** rather than global versioning. Each `BookingAuditAction` maintains its own schema version independently.

**Benefits:**
- Update one action's schema without affecting others
- Version increments tied to specific business operations
- Old records handled via discriminated unions (no migration required)
- Each action has strongly-typed schemas for input and storage

**Storage Structure:**
- Version stored separately from audit data: `{ version, data: {} }`
- Clear separation between metadata and actual audit data
- Version handling is transparent to callers

## Table Relationships

```
AuditActor (1) ──────< (many) BookingAudit
   ↑
   │ (soft reference, no FK)
   ├──────────── User (via userUuid)
   │ (soft reference, no FK)
   └──────────── Attendee (via attendeeId)
```

**Relationship Details:**
1. **AuditActor → BookingAudit**: One-to-Many with FK constraint and `onDelete: Restrict`
2. **AuditActor → User**: Soft reference (no FK) - nullable to preserve audits after user deletion
3. **AuditActor → Attendee**: Soft reference (no FK) - nullable to preserve audits after attendee deletion

## Indexing Strategy

**AuditActor Table:**
- Indexed on `email`, `userUuid`, `attendeeId` for fast lookups
- Indexed on `pseudonymizedAt` for compliance cleanup jobs

**BookingAudit Table:**
- Indexed on `bookingUid` (primary query pattern)
- Indexed on `actorId` (secondary query pattern)
- Indexed on `timestamp` (time-based sorting and filtering)

## Special Actors

**SYSTEM Actor:**
- Fixed UUID representing automated actions
- Used for: automated status changes, system-generated meeting URLs, scheduled operations, webhook-triggered actions
- Single instance across the entire system
- No userUuid, attendeeId, email, or phone

## Design Principles

### 1. Immutability
Audit records are append-only. Once created, they are never modified or deleted. This ensures complete historical accuracy, tamper-proof audit trail, and compliance with audit requirements.

### 2. Historical Preservation
Actor information is preserved even after source records are deleted. User deletion doesn't remove AuditActor records - they persist with anonymized identity fields. The audit trail remains complete and queryable even after user/attendee deletion.

### 3. Flexibility
The JSON `data` field provides schema flexibility:
- Action-specific context without database schema changes
- Easy addition of new fields for future actions
- Backward compatible with versioning

### 4. Traceability
Every action is fully traceable:
- **Who**: Actor with type and identity
- **What**: Type and Action enums
- **When**: Explicit timestamp
- **Why/How**: Contextual data in JSON field

### 5. Integrity
Database constraints ensure data quality:
- Foreign key constraints prevent orphaned records
- `onDelete: Restrict` protects audit integrity
- Unique constraints prevent duplicate actors
- Indexes ensure query performance

### 6. Reality Over Enforcement
**The audit system records actual state, not expected state.**

The audit system captures what actually happened, not to enforce business rules:
- Store actual values from the database without validation or filtering
- Avoid conditionally creating audit records based on whether state matches expectations
- If a booking is created with an unexpected status, record it for debugging
- Let the business logic layer enforce rules; the audit layer's job is faithful recording

**Benefits:**
- Audit trail shows real system behavior, including anomalies
- Easier to debug issues (incomplete audits hide problems)
- Schemas naturally evolve with business requirements
- No silent failures where audits are skipped

### 7. Compliance & Data Privacy

**GDPR & HIPAA Compliance:**
- **AuditActor records are NOT deleted on user deletion** - Instead, AuditActor records persist with PII fields nullified to preserve the immutable audit trail as required by HIPAA §164.312(b)
- **Cal.com's HIPAA compliance** requires audit records to remain immutable and tamper-proof
- **GDPR Article 17 compliance** is achieved through anonymization: When a user/guest requests deletion, set `userUuid=null`, `email=null`, `phone=null`, `name=null` on the AuditActor record
- **Retention Policy**: Application-level logic handles retention policies and full anonymization after required retention periods

### 8. Queue Privacy & Third-Party Compliance

**Zero PII in Queue:**
The audit system is designed to work with third-party queue providers (e.g., trigger.dev, AWS SQS) without exposing PII:

- **UserActor**: Only `userUuid` is queued (no email, name, or phone)
- **AttendeeActor**: Only `attendeeId` is queued (no email, name, or phone)
- **GuestActor**: Actor record is created in `AuditActor` table before queueing; only `actorId` is queued

**Actor Resolution Flow:**
1. **Producer** (BookingEventHandlerService):
   - Calls `getPIIFreeBookingAuditActor()` to get ID-only actors
   - For users: Returns `{ identifiedBy: "user", userUuid }`
   - For attendees: Returns `{ identifiedBy: "attendee", attendeeId }`
   - For guests: Creates AuditActor record first, returns `{ identifiedBy: "id", id: actorId }`

2. **Queue**: Contains only IDs, no PII

3. **Consumer** (BookingAuditTaskConsumer):
   - Calls `resolveActorId()` to resolve IDs to AuditActor records
   - All PII lookups happen in consumer, not in queue

**Design Principles:**
- Callers must provide `userUuid` (not `userId`) - if user is known, userUuid must be available
- Callers must provide `attendeeId` explicitly - no automatic lookups
- Guest actors are created synchronously before queueing (~50ms latency)
- Consumer resolution is simple and fast (just ID lookups)

**Benefits:**
- Queue can be hosted by third-party providers safely
- GDPR Article 32 compliant (appropriate technical measures)
- HIPAA compliant (no PHI in transit through queue)
- Audit trail remains complete even if queue is compromised
- Simple, explicit API with no hidden database queries

## Service Architecture

**BookingEventHandlerService** is the primary entry point for tracking booking changes. It acts as a coordinator that:
1. Receives booking events from various parts of the application
2. Calls `getPIIFreeBookingAuditActor()` to resolve actors to ID-only representations
3. Creates GuestActor records in AuditActor table if needed (before queueing)
4. Queues audit tasks via BookingAuditProducerService with zero PII
5. Handles other side effects such as webhooks, notifications, and workflow triggers

**Queue Payload Structure:**
- `bookingUid`: String identifier for the booking
- `actor`: ID-only actor object (`userUuid`, `attendeeId`, or `actorId`)
- `organizationId`: Number (for feature flag checks)
- `action`: Enum value (e.g., "CREATED", "CANCELLED")
- `data`: Action-specific data (may contain booking details but no actor PII)
- `timestamp`: Number (milliseconds since epoch)

**BookingAuditTaskConsumer** processes audit records:
- Validates queue payload structure
- Resolves actor IDs to AuditActor records using `resolveActorId()`
- Routes to appropriate action service for data validation and formatting
- Creates immutable audit records in BookingAudit table

**Future: Trigger.dev Task Orchestration**
- BookingEventHandler remains the single orchestrator for all side effects
- Each task is independent - one task failure doesn't block others
- Persistent queue handles retries, monitoring, and observability
- Easy to add features - new side effect = new task definition

## TODO

### Pending Tasks

1. **Type Safety Improvements**
   - Migration result type needs improvement: `migrationResult.data` currently has "any" type in action services with migration logic

### Completed Tasks

#### ✅ Add audit log for PENDING bookings early return
- Created `buildBookingCreatedPayload()` helper function to avoid code duplication
- Added audit logging before early return for existing PENDING bookings
- Ensures audit logs are created for both new and existing bookings in PENDING state

#### ✅ Remove PII from Queue
- Removed email/name/phone from GuestActorSchema
- Created `getPIIFreeBookingAuditActor()` for producer-side actor resolution
- Create GuestActor records upfront in AuditActor table (producer-side)
- Queue contains only IDs (userUuid, attendeeId, actorId)
- Consumer's `resolveActorId()` handles all resolution logic
- Safe for third-party queue providers (trigger.dev, AWS SQS, etc.)

#### ✅ Simplify Actor Resolution
- Removed old `getAuditActor()` wrapper function
- Callers use `getPIIFreeBookingAuditActor()` directly
- No userId fallback - callers must provide userUuid
- No automatic attendeeId lookup - callers must provide it
- Simple, explicit API with no hidden complexity

## Summary

The Booking Audit System provides a robust, scalable architecture for tracking all booking-related actions. Key features include:

- ✅ **Complete Audit Trail**: Every action tracked with full context
- ✅ **Historical Preservation**: Data retained even after deletions through PII anonymization
- ✅ **Flexible Schema**: JSON data supports evolution without migrations
- ✅ **Strong Integrity**: Database constraints ensure data quality
- ✅ **Performance**: Strategic indexes for common query patterns, UUID v7 for time-sortable IDs
- ✅ **HIPAA & GDPR Compliant**: Immutable audit records, anonymized actors, compliance-ready
- ✅ **Reality-Based Recording**: Captures actual state, aiding in debugging and analysis
- ✅ **Independent Audit Trail**: No foreign key to bookings ensures audit history persists after booking deletion

This architecture supports compliance requirements (HIPAA §164.312(b), GDPR Article 17), debugging, analytics, and provides transparency for both users and administrators.
