import type { ReputationBand } from "./constants";

/**
 * The reputation payload attached to each booking on the bookings list.
 *
 * `score` is `null` when `totalCount < MIN_BOOKINGS` (the "New booker" band) —
 * see ADR-003 / ADR-004 in specs/booker-reputation/decisions.md.
 *
 * `isSuspiciousEmail` is hardcoded `false` in M1/M2 — the slot is reserved so M3
 * (suspicious-email badge) is a focused, additive change. See design.md.
 */
export type BookerReputation = {
  /** 0-100 confidence score. `null` when below the minimum-sample threshold. */
  score: number | null;
  /** Count of past ACCEPTED bookings where this booker was a no-show. */
  noShowCount: number;
  /** Count of past ACCEPTED bookings for this booker (the denominator). */
  totalCount: number;
  /**
   * Whether the booker's email matched a suspicious-email rule.
   * Hardcoded `false` in M1/M2; computed by `suspiciousEmail.ts` in M3.
   */
  isSuspiciousEmail: boolean;
};

/**
 * The score + band pair returned by `computeScore`. The band drives badge variant
 * and label; the score drives the optional numeric display.
 */
export type ComputedReputation = {
  score: number | null;
  band: ReputationBand;
};