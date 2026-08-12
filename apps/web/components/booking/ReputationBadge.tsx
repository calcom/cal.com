"use client";

import type { ReactElement } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Badge } from "@calcom/ui/components/badge";

import {
  bandForReputation,
  type BookerReputation,
  type ReputationBand,
} from "@calcom/lib/bookerReputation";

/**
 * Badge variant + i18n label per band. See specs/booker-reputation/design.md
 * (ADR-004) and `packages/lib/bookerReputation/constants.ts` for thresholds.
 */
const variantForBand: Record<
  ReputationBand,
  "gray" | "green" | "orange" | "red"
> = {
  new: "gray",
  reliable: "green",
  occasional: "orange",
  frequent: "red",
};

const labelKeyForBand: Record<ReputationBand, string> = {
  new: "new_booker",
  reliable: "reliable",
  occasional: "occasional_no_show",
  frequent: "frequent_no_show",
};

/**
 * Renders the booker's reputation/confidence badge for a booking row.
 *
 * - `reputation === null` (no booker email / empty attendees) -> renders nothing
 *   (per design.md edge cases: no "no data" badge for empty attendees).
 * - `reputation.score === null` (below MIN_BOOKINGS sample) -> gray "New booker"
 *   band, NO numeric score.
 * - otherwise -> colored band + numeric score, e.g. "Reliable · 90".
 *
 * The suspicious-email badge (M3) is a separate sibling badge adjacent to this
 * one (ADR-005) — not rendered here.
 */
export function ReputationBadge({
  reputation,
}: {
  reputation: BookerReputation | null;
}): ReactElement | null {
  const { t } = useLocale();
  if (!reputation) return null;

  const band = bandForReputation(reputation);

  return (
    <Badge
      variant={variantForBand[band]}
      size="md"
      data-testid={`booker-reputation-badge-${band}`}
    >
      {t(labelKeyForBand[band])}
      {reputation.score !== null && (
        <span
          className="ml-1 font-semibold"
          data-testid="booker-reputation-score"
        >
          · {reputation.score}
        </span>
      )}
    </Badge>
  );
}

export default ReputationBadge;
