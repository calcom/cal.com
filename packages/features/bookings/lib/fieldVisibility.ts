/**
 * Returns true if a field should be **visible** given current responses.
 * - If no visibleIf rule => always visible.
 */
import type { z } from "zod";

import type { eventTypeBookingFields } from "@calcom/prisma/zod-utils";

type Field = z.infer<typeof eventTypeBookingFields>[number];

export function isFieldVisible(field: Field, responses: Record<string, unknown>) {
  if (!field.visibleIf) return true;

  const { parent, values } = field.visibleIf;
  const parentVal = responses?.[parent];

  // parent can be string | array | object → always normalise to string[]
  const asArray: string[] = Array.isArray(parentVal)
    ? parentVal
    : parentVal != null
    ? [String(parentVal)]
    : [];

  return asArray.some((v) => values.includes(v));
}
