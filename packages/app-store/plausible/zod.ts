import { z } from "zod";

import { eventTypeAppCardZod } from "../eventTypeAppCardZod";
import { safeUrlSchema } from "../_lib/analytics-schemas";

// Domain schema for Plausible tracking (e.g., example.com, sub.example.com)
// Each label must start and end with alphanumeric, can contain hyphens in the middle
// Labels are separated by single dots - no consecutive dots or hyphens at label boundaries
const domainSchema = z
  .string()
  .transform((val) => val.trim().toLowerCase())
  .refine(
    (val) =>
      val === "" || /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)*[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(val),
    {
      message: "Invalid domain format. Expected format: example.com",
    }
  )
  .optional();

export const appDataSchema = eventTypeAppCardZod.merge(
  z.object({
    PLAUSIBLE_URL: safeUrlSchema.optional().default("https://plausible.io/js/script.js").or(z.undefined()),
    trackingId: domainSchema,
  })
);

export const appKeysSchema = z.object({});
