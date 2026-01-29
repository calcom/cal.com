# Booking Audit System

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
- Audit trail persists independently even after users/attendees are deleted
- Unique constraints prevent duplicate audit actors
- Supports actor types: USER, GUEST, ATTENDEE, SYSTEM, APP
- Identity fields (email, phone, name) can be anonymized when source records are deleted

**BookingAudit Table:**
- Uses UUID v7 primary keys for time-sortable IDs
- `bookingUid` stored as plain string (no foreign key) to preserve audit trail after booking deletion
- `onDelete: Restrict` prevents actor deletion if audit records exist
- Explicit `timestamp` field represents business event time (may differ from `createdAt` if processed asynchronously)
- `operationId` required field for correlating audit logs from a single user action across different audit types (BookingAudit, UserAudit, etc.)
- JSON `data` field stores action-specific contextual data
- Indexed for efficient queries by `bookingUid`, `actorId`, `timestamp`, and `operationId`

**Protecting the Audit Trail:**
- Database rejects deletion of `AuditActor` records with associated `BookingAudit` records
- When a `User` is deleted, their `AuditActor` record persists with `userUuid` set to null

## Actor Types

- **USER**: Registered Cal.com users
- **GUEST**: Non-registered users (typically booking guests)
- **ATTENDEE**: Guests who have an Attendee record associated with a booking
- **SYSTEM**: Automated system actions

## Source and Actor Design Pattern

The booking audit system uses two complementary fields:

### Source: The Channel
**`source`** identifies how the action was initiated:
- **WEBAPP**: Cal.com web application
- **API_V1**: API v1 endpoint
- **API_V2**: API v2 endpoint
- **WEBHOOK**: External webhook (e.g., Stripe)
- **SYSTEM**: Background job (e.g., Tasker's task, trigger.dev job for automatic no-show detection)
- **UNKNOWN**: Source cannot be determined

### Actor: The Entity
**`actor`** identifies who or what performed the action:
- **User Actor**: Registered Cal.com user
- **Guest Actor**: Non-registered guest
- **Attendee Actor**: Attendee associated with a booking
- **System Actor**: Automated system action (generic or named for specific webhooks/services)

This separation enables clear compliance trails, easier debugging, better analytics, and security by distinguishing user-initiated vs automated actions.

## Audit Actions

The system tracks various booking actions including:
- **CREATED**: Initial booking creation
- **RESCHEDULED**: Booking time/date changed
- **ACCEPTED**: Booking request approved
- **CANCELLED**: Booking cancelled
- **REJECTED**: Booking request declined
- **RESCHEDULE_REQUESTED**: Request to reschedule
- **ATTENDEE_ADDED**: New attendee added
- **ATTENDEE_REMOVED**: Attendee removed
- **REASSIGNMENT**: Booking reassigned to different host
- **LOCATION_CHANGED**: Meeting location updated
- **NO_SHOW_UPDATED**: Host or attendee no-show status changed
- **SEAT_BOOKED**: Seat reserved in group booking
- **SEAT_RESCHEDULED**: Seat rescheduled in group booking

## Data Structure Pattern

Most audit actions track changes using a consistent structure:
- Each field tracks both old and new values: `{ old: T | null, new: T }`
- `old`: Previous value (null if field didn't exist before)
- `new`: New value after the change
- Complete before/after state captured in every record

**Exception:** The CREATED action captures initial booking state at creation using a flat object with initial values.

## Schema Versioning

The audit system uses per-action versioning. Each action maintains its own schema version independently.

**Benefits:**
- Update one action's schema without affecting others
- Old records handled via discriminated unions (no migration required)
- Strongly-typed schemas for input and storage

**Storage Structure:**
Version stored separately from audit data: `{ version, data: {} }`

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
- Indexed on `operationId` (correlating multi-booking operations)

## Special Actors

**SYSTEM Actor:**
- Fixed UUID representing automated actions
- Used for automated status changes, system-generated meeting URLs, scheduled operations
- Single instance across the entire system
- No userUuid, attendeeId, email, or phone

## Design Principles

### 1. Immutability
Audit records are append-only. Once created, they are never modified or deleted. This ensures complete historical accuracy and a tamper-proof audit trail.

### 2. Historical Preservation
Actor information is preserved even after source records are deleted. AuditActor records persist with anonymized identity fields. The audit trail remains complete and queryable even after user/attendee deletion.

### 3. Flexibility
The JSON `data` field provides schema flexibility for action-specific context without database schema changes. Backward compatible with versioning.

### 4. Traceability
Every action is fully traceable with who (actor), what (action), when (timestamp), and contextual data.

### 5. Integrity
Database constraints ensure data quality through foreign keys, `onDelete: Restrict` protection, unique constraints, and strategic indexes.

### 6. Reality Over Enforcement

The audit system records actual state, not expected state. It captures what actually happened without enforcing business rules:
- Store actual values from the database
- Record all actions, including anomalies
- Business logic layer enforces rules; audit layer records faithfully

**Benefits:**
- Shows real system behavior including anomalies
- Easier debugging
- No silent failures

### 7. Compliance & Data Privacy

**GDPR & HIPAA Compliance:**
- AuditActor records persist with PII fields nullified when users are deleted
- Maintains immutable audit trail as required by HIPAA §164.312(b)
- GDPR Article 17 compliance through anonymization: `userUuid`, `email`, `phone`, `name` set to null
- Application-level logic handles retention policies

### 8. Queue Privacy

**Zero PII in Queue:**
The audit system works with third-party queue providers without exposing PII:

- **UserActor**: Only `userUuid` is queued
- **AttendeeActor**: Only `attendeeId` is queued
- **GuestActor**: Actor record created before queueing; only `actorId` is queued

**Benefits:**
- Safe to use third-party queue providers
- GDPR and HIPAA compliant
- Audit trail remains complete even if queue is compromised

## Service Architecture

**BookingEventHandlerService** is the primary entry point for tracking booking changes. It:
1. Receives booking events from various parts of the application
2. Queues audit tasks via BookingAuditProducerService
3. Handles other side effects such as webhooks and notifications

**Queue Payload Structure:**
- `bookingUid`: String identifier for the booking
- `actor`: ID-only actor object (`userUuid`, `attendeeId`, or `actorId`)
- `organizationId`: Number (for feature flag checks)
- `action`: Enum value (e.g., "CREATED", "CANCELLED")
- `operationId`: Required string for correlating related audit logs
- `data`: Action-specific data
- `timestamp`: Number (milliseconds since epoch)
- `source`: Action source (API_V1, API_V2, WEBAPP, WEBHOOK, SYSTEM, UNKNOWN)

**BookingAuditTaskConsumer** processes audit records:
- Validates queue payload structure
- Resolves actor IDs to AuditActor records
- Routes to appropriate action service for data validation and formatting
- Creates immutable audit records in BookingAudit table

## Operation ID

The `operationId` field correlates audit logs that result from a single user action affecting multiple bookings or across different audit types (BookingAudit, UserAudit, etc.).

**Benefits:**
- Easy to identify all audits from a single user action
- Track bulk vs individual operations
- Improved debugging and understanding of action scope
- Indexed field for fast lookups

## Summary

The Booking Audit System provides a robust, scalable architecture for tracking all booking-related actions:

- **Complete Audit Trail**: Every action tracked with full context
- **Historical Preservation**: Data retained even after deletions through PII anonymization
- **Flexible Schema**: JSON data supports evolution without migrations
- **Strong Integrity**: Database constraints ensure data quality
- **Performance**: Strategic indexes, UUID v7 for time-sortable IDs
- **HIPAA & GDPR Compliant**: Immutable audit records, anonymized actors
- **Reality-Based Recording**: Captures actual state for debugging
- **Independent Audit Trail**: Persists after booking deletion
- **Operation Correlation**: Links related audit logs across different audit types

This architecture supports compliance requirements, debugging, analytics, and provides transparency for users and administrators.
