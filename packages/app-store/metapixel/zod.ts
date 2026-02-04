import { z } from "zod";

import { eventTypeAppCardZod } from "@calcom/app-store/eventTypeAppCardZod";

// Meta Pixel IDs are numeric strings of 15-16 digits
const metaPixelIdSchema = z
  .string()
  .transform((val) => val.trim())
  .refine((val) => val === "" || /^[0-9]{15,16}$/.test(val), {
    message: "Invalid Meta Pixel ID format. Expected a numeric ID (e.g., 1234567890123456)",
  })
  .optional();

export const appDataSchema = eventTypeAppCardZod.merge(
  z.object({
    trackingId: metaPixelIdSchema,
  })
);
export const appKeysSchema = z.object({});
