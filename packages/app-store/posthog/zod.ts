import { z } from "zod";

import { eventTypeAppCardZod } from "@calcom/app-store/eventTypeAppCardZod";

import { safeUrlSchema } from "@calcom/app-store/_lib/analytics-schemas";

// PostHog Project API Keys (typically start with phc_) - allow alphanumeric to not break legacy data
const posthogIdSchema = z
  .string()
  .transform((val) => val.trim())
  .refine((val) => !val || /^[A-Za-z0-9_]+$/.test(val), {
    message: "Invalid PostHog Project API Key format. Expected alphanumeric characters or underscores",
  })
  .optional();

export const appDataSchema = eventTypeAppCardZod.merge(
  z.object({
    TRACKING_ID: posthogIdSchema,
    API_HOST: safeUrlSchema.optional(),
  })
);

export const appKeysSchema = z.object({});
