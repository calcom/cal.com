# Option A: "Don't block availability" for a host — Technical steps

This document outlines the technical steps to implement a per-host flag so that some hosts (e.g. `standout@standout.work`) do not block team availability and can still receive invites.

---

## 1. Schema and migration

**File:** `packages/prisma/schema.prisma`

- Add a boolean field to the `Host` model, e.g. `ignoreForAvailability`, default `false`:
  - `ignoreForAvailability Boolean @default(false)`
- Create a new migration (e.g. `yarn prisma migrate dev --name add_host_ignore_for_availability`).
- Run `yarn prisma generate` after the migration.

**Rationale:** Host is the right place because the behaviour is per event-type and per host (e.g. one event type can have both “blocking” and “non-blocking” hosts).

---

## 2. Select the new field wherever hosts are loaded for availability/slots

Ensure `ignoreForAvailability` is selected (and passed through) wherever event type hosts are loaded for slot calculation or host resolution.

**Places to update (representative list):**

- **Event type for slots:** `packages/features/eventtypes/repositories/eventTypeRepository.ts`
  - In `findForSlots` (and any similar “for slots” / “for availability” query), add `ignoreForAvailability: true` to the `hosts.select` block (around lines 1406–1435).
- **Event type for booking flow:** `packages/features/bookings/lib/handleNewBooking/getEventTypesFromDB.ts`
  - In the `hosts` select (around 126–164), add `ignoreForAvailability: true` so booking creation and host filtering can use it.
- **Other event type selects that include hosts:** Search for `hosts: { select: { ... isFixed` (or similar) and add `ignoreForAvailability` where the event type is used for availability, host resolution, or booking creation.

**Rationale:** Slots and booking flows need to know which hosts are “ignore for availability” so they can filter or treat them differently.

---

## 3. Slots: exclude “ignore for availability” hosts from availability calculation

**File:** `packages/trpc/server/routers/viewer/slots/util.ts`

- After resolving qualified hosts and filtering blocked hosts (around 1120–1146), build the list of hosts used **only for availability**:
  - e.g. `availabilityHosts = allHosts.filter((h) => !(h as { ignoreForAvailability?: boolean }).ignoreForAvailability)` (or use a properly typed host shape that includes `ignoreForAvailability`).
- Pass `availabilityHosts` (not `allHosts`) into `calculateHostsAndAvailabilities` (and any fallback availability calculation that uses the same host list, e.g. around 1164–1183 and 1202–1212).
- Keep using `allHosts` (or the existing host list) for any logic that depends on “all” hosts (e.g. “if all hosts are blocked”) so that the bot is still considered a host for product behaviour; only availability and aggregation are based on `availabilityHosts`.

**Rationale:** Availability is the intersection of “blocking” hosts only. Non-blocking hosts (e.g. bot) stay on the event type and can still be added to the event as attendees but do not reduce available slots.

---

## 4. Types: host shape for availability and qualified hosts

**Files:**

- `packages/features/bookings/lib/host-filtering/findQualifiedHostsWithDelegationCredentials.ts`
  - Extend the `Host<T>` type (and the returned host shapes) to include `ignoreForAvailability?: boolean` so it’s present when hosts come from the event type.
- Any shared types for “host used in slots/availability” (e.g. in `packages/features/users/lib/getRoutedUsers.ts` or event type types) that represent hosts for event types with availability should include `ignoreForAvailability` so the slots util can filter without `as` casts.

**Rationale:** Type safety and a single source of truth for “host with optional ignoreForAvailability”.

---

## 5. Booking: exclude “ignore for availability” from assignable pool (round robin / collective)

**File:** `packages/features/bookings/lib/handleNewBooking/loadAndValidateUsers.ts`

- After `findQualifiedHostsWithDelegationCredentials` returns `qualifiedRRHosts`, `fixedHosts`, and `allFallbackRRHosts`, filter out hosts with `ignoreForAvailability === true` from:
  - `qualifiedRRHosts`
  - `fixedHosts`
  - `allFallbackRRHosts` (if present)
- Build `qualifiedRRUsers`, `fixedUsers`, and fallback users only from these filtered lists so that the “lucky user” / organizer is never a host that has `ignoreForAvailability`.

**Rationale:** The bot should never be chosen as the primary assignee/organizer; only “blocking” hosts should be in the assignable pool.

---

## 6. Booking: still add “ignore for availability” hosts to the calendar event (invite)

**File:** `packages/features/bookings/lib/service/RegularBookingService.ts` (e.g. `buildEventForTeamEventType`)

- Today, `buildEventForTeamEventType` receives `users` (the assigned hosts) and builds `teamMembers` from them (excluding the organizer). Only those team members are added to the event and thus become booking attendees.
- Change this so that **team members** = (assigned users \ organizer) **plus** any event type hosts with `ignoreForAvailability === true` (so they always get the invite).
- Concretely:
  - Either pass an additional parameter, e.g. `additionalTeamMemberUserIds` or `hostsWithIgnoreForAvailability`, from the caller (which has access to `eventType.hosts`), and in `buildEventForTeamEventType` resolve those to the same `Person`-like shape as other team members and append them to `teamMemberPromises` / `teamMembers`.
  - Or pass the full `eventType` (or `eventType.hosts` with user data) into `buildEventForTeamEventType` and, inside it, add to `teamMembers` every host where `host.ignoreForAvailability === true` (and not already in the assigned users list), so the bot is always on the event.

**Rationale:** The bot is not in the assignable pool (step 5) so it won’t be in `users`; without this step it would never get the invite. This step guarantees that non-blocking hosts still receive the calendar invite.

---

## 7. API: event type update (hosts)

**Files:**

- **Backend:** Event type update handler / router that accepts host create/update payloads (e.g. in `packages/trpc/server/routers/viewer/eventTypes/` or similar). Extend the host input schema to include `ignoreForAvailability?: boolean` and persist it when creating/updating hosts.
- **Validation:** If you use Zod (or similar) for host payloads, add `ignoreForAvailability` to the schema with a default of `false`.

**Rationale:** So the UI (or API clients) can set “Don’t block availability” when adding/editing a host.

---

## 8. UI: event type host configuration

**Location:** Event type edit UI where hosts are managed (e.g. under “Team” or “Assign team members” / “Hosts”).

- Add a control (e.g. checkbox) per host: **“Don’t block availability”** (or “Resource / optional attendee”), bound to `host.ignoreForAvailability`.
- Ensure the form submits the host payload including `ignoreForAvailability` so the backend can persist it (step 7).
- Add a short hint (e.g. “This host will still receive calendar invites but won’t block time slots for other bookings”) so behaviour is clear.

**Optional:** Restrict this option to team/collective/round-robin event types if that’s the only supported use case.

---

## 9. Tests and edge cases

- **Slots:** Add or extend tests that:
  - Create an event type with one host with `ignoreForAvailability: true` and one without.
  - Create a booking for the “blocking” host at a time T.
  - Assert that slot T is still available for the event type (because the only “blocking” host is free; the non-blocking host’s busy is ignored).
- **Booking creation:** Add or extend tests that:
  - Book a team event type that has a host with `ignoreForAvailability: true`.
  - Assert the chosen organizer is not that host.
  - Assert the booking’s attendees (or the resulting calendar event’s team members) include the ignore-for-availability host (e.g. bot email).
- **Round robin:** Ensure existing round-robin tests still pass; add a case where the only “blocking” RR host is available and the only “non-blocking” host is busy — booking should succeed and assign the blocking host, and the non-blocking host should still be on the event.

---

## 10. Documentation and i18n

- **Translations:** Add strings for the new UI label and hint (e.g. in `apps/web/public/static/locales/en/common.json`) and use them in the event type host form.
- **Docs:** If you maintain internal or user docs for event types / team scheduling, add a short note that “Don’t block availability” allows a host to always receive invites without affecting available slots.

---

## Order of implementation (suggested)

1. Schema + migration + generate (step 1).  
2. Select `ignoreForAvailability` in event type repos and getEventTypesFromDB (step 2).  
3. Types for hosts (step 4).  
4. Slots: filter to `availabilityHosts` before `calculateHostsAndAvailabilities` (step 3).  
5. Booking: filter assignable pool in `loadAndValidateUsers` (step 5).  
6. Booking: add ignore-for-availability hosts to team members in `buildEventForTeamEventType` (step 6).  
7. API: event type update and validation (step 7).  
8. UI: checkbox + hint (step 8).  
9. Tests (step 9).  
10. i18n and docs (step 10).

---

## Summary

- **Schema:** `Host.ignoreForAvailability` (default `false`).  
- **Slots:** Only hosts with `!ignoreForAvailability` are used when computing and intersecting availability.  
- **Booking:** Those hosts are excluded from the assignable pool but still added as team members so they get the invite.  
- **API + UI:** Event type host create/update accepts and shows “Don’t block availability”.

No code was modified in this outline; this is a technical plan only.
