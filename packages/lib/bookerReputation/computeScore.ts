import {
  MIN_BOOKINGS,
  OCCASIONAL_THRESHOLD,
  RELIABLE_THRESHOLD,
  type ReputationBand,
} from "./constants";
import type { ComputedReputation, BookerReputation } from "./types";

/**
 * Compute the booker reputation score and band from raw counters.
 *
 * Formula (ADR-003 / ADR-004 in specs/booker-reputation/decisions.md):
 *   - when `totalCount < MIN_BOOKINGS` -> band "new", score `null` (no number shown)
 *   - otherwise `score = 100 * (1 - noShowCount / totalCount)`, floored, clamped to [0, 100]
 *     and banded by RELIABLE/OCCASIONAL thresholds.
 *
 * No-show counts treat ` Attendee.noShow = null` as `false` (the DB query filters
 * `noShow = true` explicitly so callers pass already-corrected counts).
 *
 * Pure function — safe to unit test without a DB.
 */
export function computeScore(
  /** past ACCEPTED bookings where the booker was marked no-show */
  noShowCount: number,
  /** past ACCEPTED bookings for the booker (the denominator) */
  totalCount: number
): ComputedReputation {
  // Defensive: callers should already guard this, but never divide by zero and
  // never surface a score below the min-sample threshold.
  if (totalCount < MIN_BOOKINGS) {
    return { score: null, band: "new" };
  }

  // Guard against impossible inputs (shouldn't happen given the query shape).
  const safeNoShow = Math.max(0, Math.min(noShowCount, totalCount));
  const ratio = safeNoShow / totalCount;
  let score = Math.floor(100 * (1 - ratio));
  if (score < 0) score = 0;
  if (score > 100) score = 100;

  const band = bandForScore(score);
  return { score, band };
}

/**
 * Map a numeric score (already known to be valid, i.e. caller has passed the
 * min-sample gate) to its badge band. Exposed so callers that already have a
 * score can derive the band without recomputing.
 */
export function bandForScore(score: number): ReputationBand {
  if (score >= RELIABLE_THRESHOLD) return "reliable";
  if (score >= OCCASIONAL_THRESHOLD) return "occasional";
  return "frequent";
}

/**
 * Map a {@link BookerReputation} (as returned by the resolver) to its badge
 * band. A `null` score (below the min-sample threshold) maps to the "new" band.
 * Single source of truth for UI band derivation so the component stays pure.
 *
 * Accepts a narrower shape so it is callable with `null` (`getBookerReputation`
 * attaches `reputation: BookerReputation | null` per ADR-006).
 */
export function bandForReputation(
  reputation: Pick<BookerReputation, "score"> | null
): ReputationBand {
  if (!reputation || reputation.score === null) return "new";
  return bandForScore(reputation.score);
}
