### Booking request flow

This diagram shows a typical booking creation flow in local development.

```mermaid
sequenceDiagram
    participant B as Browser (User)
    participant W as apps/web (Next.js)
    participant P as apps/api (Proxy :3002)
    participant A as API v2 (:3004)
    participant S as Services/Repos (packages/lib, features)
    participant DB as Prisma → Postgres
    participant EXT as External Calendars/Email/SMS

    B->>W: Open booking page (/[user]/[type])
    W->>A: GET availability (/api/v2/availability…)
    A->>S: Compute slots (availability, buffers, RR)
    S->>DB: Read schedules, selected calendars, events
    DB-->>S: Data
    S-->>A: Available slots
    A-->>W: JSON slots
    W-->>B: Render times

    B->>W: Submit booking form
    W->>P: POST /api/v2/bookings (via fetch in Next route/app)
    P->>A: Proxy → /v2/bookings
    A->>S: Validate, assign host, create booking
    S->>DB: Insert booking, attendees, references
    DB-->>S: Booking record
    S->>EXT: Create calendar event / send emails / SMS
    EXT-->>S: Confirmation/IDs
    S->>DB: Update booking references (meetingId/url)
    DB-->>S: OK
    S-->>A: Booking created (uid, links)
    A-->>W: 201 Created (payload)
    W-->>B: Show success page (/success/:uid)
```

Notes
- apps/web calls API v2 directly in dev; the `apps/api` proxy forwards `/v2/*` to port 3004.
- Business logic lives in `packages/lib` and `packages/features` (repositories, DI modules, workflows).
- Prisma client is generated from `packages/prisma/schema.prisma` and used server-side.

### Reschedule flow

```mermaid
sequenceDiagram
    participant B as Browser (User)
    participant W as apps/web (Next.js)
    participant P as apps/api (Proxy :3002)
    participant A as API v2 (:3004)
    participant S as Services/Repos
    participant DB as Prisma → Postgres
    participant EXT as External Calendars/Email/SMS

    B->>W: Open reschedule link (/reschedule/:uid)
    W->>A: GET booking + availability
    A->>DB: Read booking (by uid)
    DB-->>A: Booking
    A->>S: Compute new slots (respect buffers/limits)
    S->>DB: Read schedules/selected calendars/events
    DB-->>S: Data
    S-->>A: Available slots
    A-->>W: JSON slots
    W-->>B: Render new times

    B->>W: Submit new time
    W->>P: PATCH /api/v2/bookings/:id/reschedule
    P->>A: Proxy → /v2/bookings/:id/reschedule
    A->>S: Validate, update booking times/status
    S->>EXT: Update external calendar event
    EXT-->>S: OK (new event time/id)
    S->>DB: Update booking, references, triggers
    DB-->>S: OK
    S-->>A: Rescheduled
    A-->>W: 200 OK
    W-->>B: Show updated booking details
```

### Cancel flow

```mermaid
sequenceDiagram
    participant B as Browser (User)
    participant W as apps/web (Next.js)
    participant P as apps/api (Proxy :3002)
    participant A as API v2 (:3004)
    participant S as Services/Repos
    participant DB as Prisma → Postgres
    participant EXT as External Calendars/Email/SMS

    B->>W: Open cancel link (/cancel/:uid)
    W->>P: POST /api/v2/bookings/:id/cancel
    P->>A: Proxy → /v2/bookings/:id/cancel
    A->>DB: Read booking (by id/uid)
    DB-->>A: Booking
    A->>S: Validate, set status=cancelled, reason
    S->>EXT: Delete/Cancel external calendar event
    EXT-->>S: OK
    S->>DB: Update booking, schedule triggers (notifications)
    DB-->>S: OK
    S-->>A: Cancelled
    A-->>W: 200 OK
    W-->>B: Show cancellation confirmation
```


