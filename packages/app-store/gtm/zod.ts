import { z } from "zod";

import { eventTypeAppCardZod } from "@calcom/app-store/eventTypeAppCardZod";

// GTM Container IDs follow the format GTM-XXXXXX where X is alphanumeric (typically 6-8 chars)
const gtmIdSchema = z
  .string()
  .transform((val) => {
    const trimmed = val.trim().toUpperCase();
    // Remove GTM- prefix if present, we'll add it back
    const clean = trimmed.replace(/^GTM-/, "");
    return `GTM-${clean}`;
  })
  .refine((val) => /^GTM-[A-Z0-9]{1,20}$/.test(val), {
    message: "Invalid GTM Container ID format. Expected format: GTM-XXXXXX",
  });

export const appDataSchema = eventTypeAppCardZod.merge(
  z.object({
    trackingId: gtmIdSchema,
  })
);

export const appKeysSchema = z.object({});
