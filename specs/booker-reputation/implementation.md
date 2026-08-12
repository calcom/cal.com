# Booker Reputation Score Implementation

## Status: not started

## Milestones

### M1 — Backend score, no UI

- [ ] Create `packages/lib/bookerReputation/constants.ts` (band thresholds as named constants: `MIN_BOOKINGS = 3`, `RELIABLE_THRESHOLD = 85`, `OCCASIONAL_THRESHOLD = 70`)
- [ ] Create `packages/lib/bookerReputation/computeScore.ts` (`computeScore(noShowCount, totalCount): { score?: number; band: "new" | "reliable" | "occasional" | "frequent" }`)
- [ ] Create `packages/lib/bookerReputation/getReputation.ts` (batched grouped query, `unstable_cache` ~60s per email, returns `Map<email, BookerReputation>`)
- [ ] Create `packages/lib/bookerReputation/index.ts` (barrel exports) + `package.json` wiring if needed
- [ ] Extend `viewer.bookings.get` resolver: collect `attendees[0].email` set, call `getReputationByEmails`, attach `reputation` to each booking
- [ ] Add `reputation` field + `BookerReputation` type to the `BookingsGetOutput` Zod schema
- [ ] Hardcode `isSuspiciousEmail: false` on attached `reputation` (M3 slot reserved)
- [ ] Tests: `computeScore` unit tests (each band + boundary + `totalCount < 3`); `getReputation` integration test over the `Attendee`/`Booking` fixtures; resolver test asserting `reputation` shape on the payload
- [ ] Verify via API response (no UI yet) — score field present and correct on a seeded booking

### M2 — UI badge column

- [ ] Create `apps/web/components/booking/ReputationBadge.tsx` (renders `<Badge>` with band variant, optional numeric score, i18n'd label)
- [ ] Update `BookingListItem.tsx`: outer container becomes flex row `[<ReputationBadge reputation={booking.reputation} />][…existing card…]`
- [ ] Wire `booking.reputation` through `useBookingListData` / `RowData` types so the component receives it
- [ ] Add English i18n keys: `new_booker`, `reliable`, `occasional_no_show`, `frequent_no_show` to `packages/i18n/locales/en/common.json`
- [ ] Empty-attendee case: render no badge (do not show a "no data" badge)
- [ ] Test: component renders correctly per band; empty-attendee case renders nothing

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