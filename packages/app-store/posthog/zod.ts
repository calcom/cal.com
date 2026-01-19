import { z } from "zod";

import { eventTypeAppCardZod } from "@calcom/app-store/eventTypeAppCardZod";

// PostHog Project API Keys (typically start with phc_) - allow alphanumeric to not break legacy data
const posthogIdSchema = z
  .string()
  .transform((val) => val.trim())
  .refine((val) => !val || /^[A-Za-z0-9_]+$/.test(val), {
    message: "Invalid PostHog Project API Key format. Expected alphanumeric characters or underscores",
  })
  .optional();

// Safe URL schema that only allows http/https protocols
const safeUrlSchema = z
  .string()
  .transform((val) => val.trim())
  .refine((val) => {
    if (!val) return true;
    try {
      const url = new URL(val);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch {
      return false;
    }
  }, { message: "Invalid URL format. Must be a valid http or https URL" })
  .optional();

export const appDataSchema = eventTypeAppCardZod.merge(
  z.object({
    TRACKING_ID: posthogIdSchema,
    API_HOST: safeUrlSchema,
  })
);

export const appKeysSchema = z.object({});
