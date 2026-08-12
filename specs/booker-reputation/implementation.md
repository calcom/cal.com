# Booker Reputation Score Implementation

## Status: M2 complete (M1 + M2 done; M3 next)

## Milestones

### M1 — Backend score, no UI  ✅

- [x] Create `packages/lib/bookerReputation/constants.ts` (band thresholds as named constants: `MIN_BOOKINGS = 3`, `RELIABLE_THRESHOLD = 85`, `OCCASIONAL_THRESHOLD = 70`; `REPUTATION_CACHE_TTL_SECONDS = 60`; `REPUTATION_CACHE_TAG`; `ReputationBand` type)
- [x] Create `packages/lib/bookerReputation/types.ts` (`BookerReputation`, `ComputedReputation`)
- [x] Create `packages/lib/bookerReputation/computeScore.ts` (`computeScore(noShowCount, totalCount)`; `bandForScore(score)` helper; defensive clamp of `noShowCount`/score range)
- [x] Create `packages/lib/bookerReputation/getReputation.ts` (`getReputationByEmailsUncached(emails, prisma)` batched pair of Prisma `groupBy` over past `ACCEPTED` bookings; `getReputationByEmails(emails)` cached wrapper via `@calcom/lib/unstable_cache`, lazy `@calcom/prisma` singleton import; `isSuspiciousEmail` hardcoded `false`)
- [x] Create `packages/lib/bookerReputation/index.ts` (barrel exports)
- [x] Extend `viewer.bookings.get` resolver (`packages/trpc/server/routers/viewer/bookings/get.handler.ts`): collect deduped `attendees?.[0]?.email` set, call `getReputationByEmails`, attach `reputation: BookerReputation | null` to each booking; defensive access where `attendees` is undefined
- [x] The `reputation` field flows through the inferred `BookingsGetOutput` Zod-derived type (no explicit output schema to edit — output shape is inferred from handler return; the M2 UI consumes `booking.reputation`)
- [x] `isSuspiciousEmail` hardcoded `false` (M3 slot reserved)
- [x] Tests: `computeScore.test.ts` (12 — bands, boundaries, min-sample gate, defensive clamping); `getReputation.test.ts` (6 — empty set, dedupe, score computation, New booker band, missing totals, ASSERTED-only+past-endTime filter shape via `prismaMock`)
- [x] Updated existing `get.handler.test.ts` assertion to expect the new `reputation: null` field on bookings in the payload (contract change per ADR-007)
- [x] All 18 lib tests pass; `tsc --noEmit` on `packages/lib` and `packages/trpc` clean for the touched files (pre-existing `username.test.ts` shares the same `TS2307` for `@calcom/testing/lib/__mocks__/prismaMock` under `moduleResolution: node` — a repo-wide tsconfig limitation, not a regression; vitest resolves via bundler).
- No UI yet. Score field is present on the API response and verifiable end-to-end via the resolver test.

### M2 — UI badge column  ✅

- [x] Create `apps/web/components/booking/ReputationBadge.tsx` — renders the `<Badge>` with the band's variant + i18n'd label; numeric score shown only when `score !== null`; `bandForReputation(reputation)` (centralized in lib) derives the band from `reputation: BookerReputation | null` (returns `"new"` for null). Explicit `ReactElement | null` return type. `"use client"` directive.
- [x] Update `BookingListItem.tsx` imports `ReputationBadge`; renders it as the new left-most child inside the `flex flex-col sm:flex-row` container (before the time column) per ADR-008 — single-cell card structure preserved, no DataTable restructure
- [x] `booking.reputation` flows automatically via the inferred `BookingsGetOutput`/`BookingItemProps` type — no manual type wiring needed
- [x] Add English i18n keys (`packages/i18n/locales/en/common.json`): `new_booker`, `reliable`, `occasional_no_show`, `frequent_no_show` (other locales fall back via `i18n.lock`)
- [x] Empty-attendee case (`reputation === null`) renders nothing (no "no data" badge) — asserted by test
- [x] Added centralized `bandForReputation(reputation)` helper to `computeScore.ts` + exported via `index.ts` (single source of truth for "reputation → band", removes the inline ternary from the component)
- [x] Tests: `ReputationBadge.test.tsx` (6 — null reputation, new-booker gray band w/o score, reliable/occasional/frequent bands w/ score, RELIABLE_THRESHOLD=85 boundary); `computeScore.test.ts` extended with `bandForReputation` tests (3)
- [ ] Suspicious-email badge slot reserved but **not rendered** in M2 (per design — M3 ships the badge). The `isSuspiciousEmail` field is present in the payload (hardcoded `false` in M1) and would slot in adjacent to `ReputationBadge`.

## Dev seed (demo data)  ✅

- [x] Extend `scripts/seed.ts` with `seedBookerReputationDemo()` (invoked at the end of `main()`; idempotent — deterministic UIDs, skips existing bookings). Demonstrates the badge on the initial seeded state for new contributors — no manual no-show marking needed.
- [x] Attaches two EXTERNAL bookers to the existing seeded `pro` host (`pro@example.com`) on its `30min` event type:
  - `flaky-booker@example.com` — "Flaky Booker": 5 past ACCEPTED bookings, first 4 marked `noShow=true` → score `100*(1 - 4/5) = 20` → **"frequent" (red)**
  - `reliable-booker@example.com` — "Reliable Booker": 5 past ACCEPTED bookings, 0 no-shows → score `100` → **"reliable" (green)**
- [x] Plus one upcoming ACCEPTED booking per booker so each badge renders on the host's **Upcoming** bookings tab (`/bookings/upcoming`); the score is historical-predictive (computed from the past bookings only — see `getReputation.ts`).
- [x] Console logs the seeded score per booker for sanity; skips gracefully (logs `ℹ️`) if the `pro` host or its `30min` event type isn't seeded yet, so it never breaks the seed if ordering changes.
- Reached via `yarn db-seed` → `packages/prisma` `db-seed` → `yarn prisma db seed` → `seed-basic` → `ts-node scripts/seed.ts` (confirmed `scripts/seed.ts` is the live seed file, not the unconnected `packages/prisma/seed.ts` referenced only by the root `seed` script alias).

### M3 — Suspicious-email badge

- [ ] Create `packages/lib/bookerReputation/suspiciousEmail.ts` (throwaway-domain blocklist constant + TLD regex constant; `isSuspiciousEmail(email): boolean`)
- [ ] Update `getReputationByEmails` to evaluate `isSuspiciousEmail` per email (or compute inline in resolver)
- [ ] Update `ReputationBadge.tsx` / `BookingListItem.tsx` to render the suspicious-email badge adjacent to `ReputationBadge` (after it — reputation first, email flag second)
- [ ] Tests: `isSuspiciousEmail` unit tests (blocklist hit, TLD hit, both miss, false negatives on legit domains); component test for both-badges-present render

## In Progress

## Blocked

## Next Steps

- Begin M1 starting with `constants.ts` (smallest, foundational)
- Then `computeScore.ts` + unit tests (pure function, easiest to lock down first)
- Then `getReputation.ts` + integration tests
- Then the resolver change + schema tweak

## Session Notes

- Grilling session completed — all design decisions recorded in `decisions.md`. Design tree walked top-down: identity → storage → history query → email regex → score formula → badge bands → UI placement → data plumbing → milestone cut.
- Migrations: **none** in M1-M3 (consequence of the on-the-fly computation decision in Q2 — surfaced explicitly because the original feature prompt assumed migrations would be needed).