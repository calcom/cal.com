# Booker Reputation Score Design

## Overview

The bookings list (`/bookings/*`) shows each appointment with a per-booking reputation/confidence score and badge, computed from the primary booker attendee's historical no-show record. The score is calculated on-the-fly from existing data (no migrations), displayed as a numeric 0-100 value with a colored badge indicating reliability band. A separate suspicious-email badge is added in a later milestone.

## Problem Statement

A host (logged-in Cal account user) accepting bookings against their event types has no signal for whether a given booker is likely to show up. `Attendee.noShow` is already recorded per attendee (set via the platform `markNoShow` API) and is even used in routing (`includeNoShowInRRCalculation` on `EventType`), but it is not surfaced to the host at the point of viewing their bookings. Hosts cannot triage upcoming appointments by booker reliability, nor review past attendance patterns at a glance.

## User Stories

- As a host, when viewing my upcoming bookings, I want to see each booker's no-show track record so I can anticipate and prepare for (or pre-emptively reschedule) likely no-shows.
- As a host, when reviewing past bookings, I want to see whether a booker has a history of no-shows so I can decide whether to accept future bookings from them.
- As a host, I want the signal to be interpretable (a 0-100 score plus a colored band) rather than a raw boolean, so I can scan the list quickly without doing mental arithmetic.

## Technical Design

### Database Changes

**None.** The feature reads existing data only:

- `Attendee.noShow Boolean? @default(false)` — per-attendee no-show flag (already present, indexed by `email` and `[email, bookingId]`)
- `Booking.status` / `Booking.endTime` — used to scope the history denominator to past, accepted bookings

No migrations, no new tables, no new columns in M1-M3.

### Identity Model

Reputation is keyed **purely by `Attendee.email`** (the primary booker's email — `booking.attendees[0].email`). The existing `email` index on `Attendee` makes history aggregation cheap. Logged-in Cal users booking their own/teammates' event types are treated the same as guest bookers (email-keyed); introducing a normalized `BookerProfile` identity is deferred to future-work.md.

### Score Computation

Per email, the history query computes:

- `noShowCount` = count of past `ACCEPTED` bookings where this email's `Attendee.noShow = true`
- `totalCount` = count of past `ACCEPTED` bookings for this email (the denominator)

`ACCEPTED` is the only status in the denominator — `CANCELLED` / `REJECTED` bookings were not commitments and are excluded. A cancellation by the booker is **not** counted as a no-show (it's a non-event, not a missed commitment).

The query (single batched statement per page, `GROUP BY` the page's `attendees[0].email` set, **not** N queries):

```sql
SELECT
  "Attendee".email,
  COUNT(*) FILTER (WHERE "Attendee"."noShow" = true) AS no_show_count,
  COUNT(*) AS total_count
FROM "Attendee"
JOIN "Booking" ON "Booking".id = "Attendee"."bookingId"
WHERE "Attendee".email = ANY($1::text[])
  AND "Booking"."endTime" < now()
  AND "Booking".status = 'ACCEPTED'
GROUP BY "Attendee".email;
```

### Score Formula

Confidence score, shown **only when `totalCount >= 3`** (the minimum-sample threshold; below it the gray "New booker" band renders instead of a number):

```
score = 100 * (1 - noShowCount / totalCount)
```

Plain raw rate, **no Laplace/Bayesian smoothing** in M1-M3 (smoothing is deferred to future-work.md / `decisions.md`). The min-3 gate already excludes the worst small-N case (1/1 = 0%); inside `totalCount >= 3`, raw rate is statistically sane and has no invented constants to defend.

### Badge Bands

| Condition           | Label                | Badge variant | Score shown? |
|---------------------|----------------------|---------------|--------------|
| `totalCount < 3`    | "New booker"         | gray          | no number    |
| `score >= 85`       | "Reliable"           | green         | yes          |
| `70 <= score < 85` | "Occasional no-show" | orange        | yes          |
| `score < 70`        | "Frequent no-show"   | red           | yes          |

Band thresholds live as named constants in `packages/lib/bookerReputation/constants.ts` (not magic numbers inline) so future tweaks are trivial.

### API Changes

Extend the existing tRPC `viewer.bookings.get` resolver (`BookingsGetOutput`):

1. After fetching the page's bookings, collect the set of `attendees[0].email` values across the page (deduplicated, ignoring `attendees: []`).
2. Run the batched history query (schema above) for that email set, wrapped in `@calcom/lib/unstable_cache` keyed per email (~60s TTL).
3. Attach a `reputation` field to each booking in the response:

```ts
type BookerReputation = {
  score: number;          // 0-100, undefined if totalCount < 3
  noShowCount: number;
  totalCount: number;
  // isSuspiciousEmail added in M3; field present-but-false in M1/M2
  isSuspiciousEmail: boolean;
};
```

- Add `reputation` to the `BookingsGetOutput` Zod schema (response-shape change only, not a Prisma migration).
- For bookings with no attendees (`attendees: []`), render no badge — do not fabricate a "no data" badge.

### Suspicious Email Detection (M3 only)

A separate `isSuspiciousEmail` boolean, **not folded into the numeric score** (it renders as its own badge next to the reputation badge). Two signals, both living in `packages/lib/bookerReputation/suspiciousEmail.ts` as a hardcoded lib constant (no DB config in M1-M3):

1. A **throwaway-domain blocklist** — an array constant of known throwaway providers (`mailinator.com`, `guerrillamail.com`, `tempmail.*`, `10minutemail.com`, `yopmail.com`, `sharklasers.com`, `dispostable.com`, `temp-mail.org`, ~15-20 entries). Match: booker's email domain `∈ blocklist`.
2. A **TLD regex** for high-spam TLDs: `/\.(xyz|top|click|bid|country|gq|cf|ml|tk|work)$/i` on the full email.

No gibberish-local-part heuristic in M1-M3 (too noisy, too many false positives on legitimate corporate aliases — deferred). `isSuspiciousEmail = true` if *either* signal matches.

In M1/M2, the `isSuspiciousEmail` field is present in the payload and hardcoded `false` (no lib constant yet, no badge render) — the slot is reserved so M3 is a focused, additive change.

### UI Changes

Single visible column is `customView`, which renders the entire `BookingListItem` card per row (table header hidden, compact variant). The reputation badge is rendered as the **left-most element inside the `customView` cell** (i.e. inside `BookingListItem.tsx`), making the outer container a flex row: `[ReputationBadge] [existing card content]`. This is **not** a new TanStack display column — it stays a single-cell card to avoid restructuring the DataTable's compact+hidden-header layout and mobile-responsive behavior.

- New component: `apps/web/components/booking/ReputationBadge.tsx` (renders a `<Badge>` with the band's variant, optionally the numeric score, i18n'd label).
- `BookingListItem.tsx` becomes a flex row — `[<ReputationBadge reputation={booking.reputation} />][…existing card…]`.
- Score renders on **all five tabs**: upcoming / recurring / past / cancelled / unconfirmed. The score is booker-level metadata; gating per-tab creates inconsistency with no cost saving (one resolver computes it once).

M3 follow-up: add the suspicious-email badge adjacent to `ReputationBadge`, **after** the reputation badge (reputation first — it's the scored signal; suspicious-email second — the categorical flag).

### i18n

New translation keys (English primary, `en` in `packages/i18n/locales/en/common.json`):

- `new_booker`, `reliable`, `occasional_no_show`, `frequent_no_show`
- Possibly: `booker_reputation_tooltip` explaining the score basis (optional — confirm in M2)

Other locales fall back to English via `i18n.lock` for M1/M2; translation can be backfilled later.

## Edge Cases

- **Empty attendees** (`attendees: []`): no badge rendered (see API Changes).
- **`totalCount < 3`**: render the gray "New booker" badge; **no numeric score** (avoids penalizing first-time bookers and avoids false-precision at small N).
- **No-show count is null vs false**: `Attendee.noShow` is `Boolean?` — treat `null` as `false` in the aggregate (`FILTER (WHERE "noShow" = true)` already excludes nulls).
- **Upcoming vs past context**: score is historical-predictive — same computation, same render in both contexts. On upcoming bookings, the score reflects the booker's track record *going into* this commitment; on past bookings, the booker's track record *up to* that booking (we treat the aggregate as the historical snapshot — not recomputing "as-of" date per booking in M1-M3; deferred to future-work.md if time-travelling accuracy becomes a concern).
- **Bookings with no-show but status `CANCELLED`**: excluded from denominator entirely — not counted as no-shows (cancelled = non-event).
- **Multi-attendee bookings**: score uses only `attendees[0].email` (the primary booker). Per-attendee display is deferred to future-work.md. Additional attendees' reputation is not rendered in M1-M3.

## Out of Scope

- Persisted score/counters in a `BookerReputation` table (Q2 decision: compute on-the-fly)
- Smoothed (Laplace/Bayesian) confidence formula (M1 uses raw rate)
- Per-attendee reputation display in multi-attendee bookings (booking-level only)
- Server-side sort/filter of the list by reputation score (and the DataTable filter UI for it)
- Gibberish-local-part email heuristic
- DB-backed or per-team override of the suspicious-email ruleset
- Booker-facing changes (confirmation/success pages) — host-view only
- Blending the suspicious-email signal into the numeric score (separate badge)
- A "min-3" / scoring threshold UI for the host to tune — thresholds are code constants for M1-M3

## Milestones

- **M1 — Backend score, no UI.** New `packages/lib/bookerReputation/` (`computeScore.ts`, `getReputation.ts`, `constants.ts`); batched grouped SQL off `Attendee`/`Booking`; `unstable_cache` ~60s per email; extend `viewer.bookings.get` resolver to attach `reputation`; Zod schema for `BookingsGetOutput`; `isSuspiciousEmail` field hardcoded `false`. Tests for `computeScore` bands + the SQL aggregate. No UI.
- **M2 — UI badge column.** New `apps/web/components/booking/ReputationBadge.tsx`; `BookingListItem.tsx` becomes flex row with badge as left-most element; wire `booking.reputation` from `useBookingListData` payload; add English i18n keys. Suspicious-email badge slot reserved but not rendered.
- **M3 — Suspicious-email badge.** Add `suspiciousEmail.ts` lib constant (blocklist + TLD regex); compute `isSuspiciousEmail` in the resolver; render the suspicious-email badge adjacent to `ReputationBadge`.
- **M4 — (deferred, see future-work.md)** persist counters, smoothed formula, server-side sort/filter, per-attendee display, `BookerProfile` identity table, per-team email-rule config.