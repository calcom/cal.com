import { z } from "zod";

import { eventTypeAppCardZod } from "../eventTypeAppCardZod";
import { safeUrlSchema } from "@calcom/app-store/_lib/analytics-schemas";

// Domain schema for Plausible tracking (e.g., example.com, sub.example.com)
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
