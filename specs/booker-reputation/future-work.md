# Booker Reputation Score Future Work

Ideas and enhancements deferred from initial implementation (M1-M3). See `decisions.md` for the rationale behind each deferral.

## Enhancements

### Persistence & performance

- **Persist raw counters in a `BookerReputation` table** (keyed by `email`: `noShowCount`, `totalCount`, `noShowRate`, `updatedAt`) — updated via a write hook on `Attendee.noShow` flip + on `Booking` create. Enables server-side sort/filter of the bookings list by reputation, off-the-shelf in the DataTable. Re-evaluate once the on-the-fly aggregate (ADR-002) shows a measurable list-page cost.
- **Hybrid (C) from the original grilling session** — persist raw counters, compute the *final blended score* on read so the formula stays tunable without a backfill. The M4 path most likely to win if we pursue persistence.
- **Cache the `isSuspiciousEmail` result into the `BookerReputation` row** — only worth it if the regex ever becomes expensive (it isn't in M1-M3).

### Identity & accuracy

- **Normalized `BookerProfile` identity table** — merge one-or-more emails + optional `User` into a single reputation profile. Resolves the "user with two emails = two reputations" wart from ADR-001. Requires a merge UI / deduplication strategy.
- **"As-of" time-travel accuracy** — when viewing a past booking, compute the score the host *would have seen* at that booking's start time (excluding this and all later bookings). Currently the score is a live snapshot for all tabs (ADR-003). Worth it only if hosts review historical bookings by score heavily.
- **Per-attendee reputation display** — render the reputation badge next to each attendee's name/email inside `DisplayAttendees`, not just the primary booker. Corrects the ADR-006 trade-off (additional attendees' reputation is silently dropped in M1-M3).

### Score formula

- **Laplace/Bayesian smoothing** — `confidence = 100 * (1 - (noShowCount + α) / (totalCount + α + β))`, e.g. α=β=1. Softens small-N edge cases inside `totalCount >= 3` (e.g. 1/3 → 75 instead of 66). Trade-off: introduces magic numbers to defend to end users.
- **Time-decay weighting** — recent no-shows count more (e.g. last 90 days double-weighted). Lets reformed no-showers recover. Replaces the all-time flat rate from ADR-003.
- **Smarter attendance signals** — include "attended but joined late / left early" if/when the daily-webhook no-show detection provides finer-grained signals (currently `Attendee.noShow` is binary).

### Email detection

- **Gibberish-local-part heuristic** — flag emails like `xkj29f8s7d@...`. Deferred in M1-M3 because the false-positive rate on legit corporate aliases (`abc+test@vendor.com`, project codenames) is too high without a tuned model.
- **DB-backed / per-team `SuspiciousEmailRule` config** — let teams maintain their own throwaway-domain blocklist and TLD set without a code release. Promote the lib constant in M3 to a `SuspiciousEmailRule` table with team/org scope.
- **Disposable-email API integration** (e.g. Kickbox / NeverBounce disposable detection) — more accurate than a static blocklist, at operational + privacy cost.

### UX

- **Tooltip explaining the score basis** — i18n'd tooltip on the reputation badge ("Based on N past accepted bookings; X no-shows"). Helpful at small N to explain why "New booker" instead of a number.
- **Host-tunable threshold settings** — expose `MIN_BOOKINGS`, `RELIABLE_THRESHOLD`, `OCCASIONAL_THRESHOLD` as per-host or per-event-type settings instead of code constants (ADR-004).
- **Surfacing in the booking confirmation flow for the host** — currently the host sees the score only on the bookings list; surfacing it in the "new booking" notification email or webhook would let hosts pre-emptively reschedule before the slot.
- **Booking rejection / soft-block on low reputation** — automatically place low-reputation bookings into `PENDING` (instead of `ACCEPTED`) for host review. Touches booking intake; needs careful defaults to avoid blocking legit first-time bookers.

## Technical Debt

- The `isSuspiciousEmail` field is hardcoded `false` in M1/M2 (slot reserved for M3) — a small wart; remove the stub once M3 lands or leave as the trivial fallback.
- English-only i18n keys ship in M2; other locales fall back via `i18n.lock` until translators backfill.

## Nice to Have

- Reputation history timeline for a single booker (host search-by-email → see no-shows over time). Pure read-only view; cheap to add once persistence lands.
- Per-event-type reputation (a booker may no-show one type of meeting but not another) — requires partitioning the history query by `eventTypeId`.
- Aggregate booker-reputation *across hosts* on a team — useful for org-wide policy, but raises cross-host privacy questions (does host A see bookings host B took from the same booker?).