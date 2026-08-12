/**
 * Minimum number of past accepted bookings a booker must have before a numeric
 * reputation score is surfaced. Below this, the "New booker" band renders.
 *
 * See specs/booker-reputation/design.md.
 * Decision: ADR-003 in specs/booker-reputation/decisions.md.
 */
export const MIN_BOOKINGS = 3;

/**
 * Score >= this renders the "Reliable" (green) band.
 */
export const RELIABLE_THRESHOLD = 85;

/**
 * Score >= this (and < RELIABLE_THRESHOLD) renders the "Occasional no-show" (orange) band.
 * Score < this renders the "Frequent no-show" (red) band.
 */
export const OCCASIONAL_THRESHOLD = 70;

/**
 * Per-email reputation cache TTL (seconds) for the on-the-fly computation.
 * See ADR-002 / ADR-007 in specs/booker-reputation/decisions.md.
 */
export const REPUTATION_CACHE_TTL_SECONDS = 60;

/**
 * Cache tag used to invalidate booker-reputation cache entries.
 */
export const REPUTATION_CACHE_TAG = "booker-reputation";

/**
 * Reputation band labels. These map to user-facing i18n keys (added in M2):
 *   new         -> "new_booker"
 *   reliable    -> "reliable"
 *   occasional  -> "occasional_no_show"
 *   frequent    -> "frequent_no_show"
 *
 * "new" is the only band that renders WITHOUT a numeric score.
 */
export type ReputationBand = "new" | "reliable" | "occasional" | "frequent";