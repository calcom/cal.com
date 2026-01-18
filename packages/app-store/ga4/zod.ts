import { z } from "zod";

import { eventTypeAppCardZod } from "../eventTypeAppCardZod";

// GA4 Measurement IDs follow the format G-XXXXXXXXXX where X is alphanumeric (typically 10 chars)
const ga4IdSchema = z
  .string()
  .transform((val) => val.trim().toUpperCase())
  .refine((val) => val === "" || /^G-[A-Z0-9]{1,20}$/.test(val), {
    message: "Invalid GA4 Measurement ID format. Expected format: G-XXXXXXXXXX",
  })
  .optional();

export const appDataSchema = eventTypeAppCardZod.merge(
  z.object({
    trackingId: ga4IdSchema,
  })
);

export const appKeysSchema = z.object({});
