import { z } from "zod";

import { eventTypeAppCardZod } from "@calcom/app-store/eventTypeAppCardZod";

// Twipla Site IDs can be UUID or alphanumeric strings
const twiplaSiteIdSchema = z
  .string()
  .transform((val) => val.trim())
  .refine((val) => !val || /^[A-Za-z0-9-]+$/.test(val), {
    message: "Invalid Twipla Site ID format. Expected alphanumeric characters or UUID",
  })
  .optional();

export const appDataSchema = eventTypeAppCardZod.merge(
  z.object({
    SITE_ID: twiplaSiteIdSchema,
  })
);

export const appKeysSchema = z.object({});
