# Booker Reputation Score Decisions

## ADR-001: Reputation keyed by `Attendee.email` (no normalized BookerProfile)

### Context

Reputation aggregates per-booker, but "the booker" isn't a single clear entity in the schema. Needed an identity aggregation key.

### Options Considered

1. **Email-only** — key off `Attendee.email` (already indexed on `email` and `[email, bookingId]`).
2. **Logged-in User + email fallback** — aggregate against `User` when the booker has a Cal account, fall back to email for guests.
3. **New `BookerProfile` table** — normalized identity merging one-or-more emails + optional `User`.

### Decision

**(A) Email-only.**

Rationale:
- `Attendee.email` already indexed — zero new index work for history queries
- Spam regex is inherently email-based
- Cal.com's booking flow is overwhelmingly guest (email-entered) attendees; account-holding bookers are the minority, so (B) adds complexity for marginal accuracy gain
- A reputation table keyed by `email` would be a single new table (when we ever persist — see ADR-002); (C) can be bolted on later without rework since email stays the sub-key

### Consequences

- A single user with two email addresses gets two reputations until/unless a `BookerProfile` merge UI is built (deferred to future-work.md).
- No schema/migration work for the identity dimension.

---

## ADR-002: Compute score on-the-fly — no persisted `BookerReputation` table

### Context

The no-show history could either be aggregated on every list render or persisted in a `BookerReputation` table, updated via trigger/job on no-show mark.

### Options Considered

1. **Compute on-the-fly** — no new table; aggregate per page query.
2. **Persist in `BookerReputation` table** — counter columns, kept in sync via writes on no-show mark + booking create.
3. **Hybrid** — persist raw counters, compute final blended score on read.

### Decision

**(A) Compute on-the-fly.**

Rationale:
- Minimal schema footprint — no migrations, no counter-keeping write path to keep in sync
- Shippable fastest ("ship working minimal version sooner" was the explicit ask)
- Single batched `GROUP BY` per page over the page's email set (≈10 emails) is cheap with the existing `email` index
- `unstable_cache` ~60s per email absorbs repeat renders

### Consequences

- **Cannot server-side sort/filter the DataTable by final blended score** — deferred to a future milestone where persistence (re-)enters.
- Repeat-page-render cost absorbed by short per-email cache; if it becomes a hotspot, persist later (no UI rework needed — M4 in future-work.md).
- No new tables/columns for M1-M3 — the feature prompt's initial assumption that "probably some db migrations for any extra tables or cols" was voided by this decision. Surface explicitly to stakeholders.

---

## ADR-003: History denominator = past + `ACCEPTED` only; all-time flat rate (no decay)

### Context

Which bookings count toward a booker's no-show history, and how is it weighted over time?

### Decision

- **Denominator** = past bookings where `status = ACCEPTED` (the booking was an actual commitment). `CANCELLED` / `REJECTED` excluded as non-events. A booker-initiated cancellation is *not* counted as a no-show (it's a clean disengagement, not a missed commitment).
- **Weighting**: all-time flat rate (`noShowCount / totalCount`) for M1 — no time-decay. A "reformed" no-shower does not recover under M1; decay is a formula tweak for M4.
- **Minimum sample threshold**: `totalCount >= 3` before surfacing a numeric score; below that the gray "New booker" band renders. Avoids penalizing first-time bookers and avoids false-precision at small N (e.g. 1/1 = 0% would look catastrophic).

### Consequences

- Formula is trivially defensible (`100 * (1 - noShowCount/totalCount)`); no invented constants to bikeshed or explain to end users.
- Smoothing (Laplace/Bayesian pseudo-counts) is deferred — the min-3 gate already excludes the worst small-N edge case.

---

## ADR-004: Numeric 0-100 confidence score, badges colored by range

### Context

How to present the score: categorical label, raw percentage, or invented "confidence score"?

### Decision

**(C) Numeric 0-100 confidence score, with a `Badge` whose variant + label depends on the score's range.**

Bands (thresholds are named constants, not magic numbers):

| Condition           | Label                | Badge variant | Score shown? |
|---------------------|----------------------|---------------|--------------|
| `totalCount < 3`    | "New booker"         | gray          | no number    |
| `score >= 85`       | "Reliable"           | green         | yes          |
| `70 <= score < 85` | "Occasional no-show" | orange        | yes          |
| `score < 70`        | "Frequent no-show"   | red           | yes          |

### Consequences

- Matches the user's original phrasing ("confidence/reputation score", "with a badge").
- Reuses the existing `Badge` infra in `BookingListItem.tsx` and the `assignmentReasonBadgeTitleMap` styling pattern.
- Threshold tweaks are single-constant edits — low bikeshedding cost going forward.

---

## ADR-005: Suspicious-email signal is a separate badge, NOT blended into the score

### Context

A spammy email address could either reduce the numeric confidence score or render as a separate flag.

### Decision

**Separate badge.** `isSuspiciousEmail` renders as its own badge next to the reputation badge (reputation first, suspicious-email second); it does not enter the numeric formula.

Rationale:
- A spammy TLD on an email with zero no-shows is a flag, not a conviction — folding it in muddies both signals
- Keeping them separate preserves interpretability: the numeric score reflects *behavior*, the email badge reflects *pattern*
- The host can weigh both independently

### Consequences

- Two badges in the left-cluster render instead of one. Cheap.
- The suspicious-email ruleset (blocklist + TLD regex) is a hardcoded lib constant in M1-M3 — no per-team tuning yet (deferred to future-work.md).

---

## ADR-006: Score rendered at booking level (single attendee), not per-attendee

### Context

Cal bookings can have multiple attendees. Reputation could be per-attendee or per-booking.

### Decision

**Booking-level.** Score is computed off `booking.attendees[0].email` (the primary booker) and rendered once per booking, not per attendee.

### Consequences

- Additional attendees' reputation is silently dropped in M1-M3. Per-attendee display is deferred to future-work.md. (Accepted trade-off for the minimal-shippable scope.)
- `BookingListItem.tsx` change stays tiny — one badge, one render path, fits the PR-size budget.

---

## ADR-007: Score computed in the `viewer.bookings.get` resolver and attached to `BookingsGetOutput` (single round-trip)

### Context

The score could be computed server-side as part of the bookings list response, or fetched client-side via a separate tRPC call.

### Decision

**Backend computes, attached to the response payload.** After fetching the page's bookings, the resolver runs one batched `GROUP BY email` aggregate over the set of `attendees[0].email` on the page and attaches a `reputation` field to each booking.

### Consequences

- One round-trip; component receives the score via the typed `BookingsGetOutput` it already consumes — no client fetch waterfall.
- Server-side sort/filter by score becomes available (when pursued) without a UI change: `noShowCount` is in the payload. (Sorting by *blended* score remains blocked by ADR-002's on-the-fly decision, since the blended score is computed on read; sorting by `noShowCount` as a proxy is feasible.)
- `unstable_cache` per email (`~60s`) lives naturally at the resolver boundary.
- Touches the bookings resolver — a complex, hot path — but the cost is bounded (single `GROUP BY` over ~10 emails per page). If it ever becomes a hotspot, split to a separate client fetch (ADR-007 path B) without UI rework.

---

## ADR-008: Reputation badge as the left-most element inside the single `customView` cell (not a new TanStack column)

### Context

The bookings list is structurally a single visible column — `customView` — which renders the entire `BookingListItem` card per row (table header hidden, `variant="compact"`). All other columns are hidden filter columns.

### Decision

**Render the reputation badge as the left-most element *inside* `BookingListItem`** — make the outer container a flex row `[<ReputationBadge>][…existing card…]`. Architecturally still one cell.

### Consequences

- Zero DataTable restructuring — preserves compact variant, hidden header, mobile-responsive card behavior.
- Reputation badge is not a "real" TanStack column → cannot be sorted/filtered via the DataTable filters UI in M1-M3. (Per future-work.md, server-side sort/filter is M4 anyway.)
- Smallest possible M2 blast radius — fits the ≤5-7 files / ≤500 lines PR rule.

---

## ADR-009: Score shown on all five bookings tabs (upcoming / recurring / past / cancelled / unconfirmed)

### Decision

Scores render in all tabs; no per-tab gating.

### Consequences

- Score is booker-level metadata — surfacing it in every context (cancelled, unconfirmed) gives the host useful context (was the booker a chronic no-shower? did they cancel on a booking they would've likely missed?) without per-tab conditionals.
- The resolver computes it once; gating in the component would be one `if` and create observable inconsistency (badge appears/disappears on otherwise-similar rows with no explanation).
- Host-view only — no booker-facing confirmation/success page changes in M1-M3 (per Out of Scope).