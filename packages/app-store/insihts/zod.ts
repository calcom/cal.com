import { z } from "zod";

import { eventTypeAppCardZod } from "@calcom/app-store/eventTypeAppCardZod";

// Insihts Site IDs are alphanumeric strings
const insightsSiteIdSchema = z
  .string()
  .transform((val) => val.trim())
  .refine((val) => !val || /^[A-Za-z0-9_-]+$/.test(val), {
    message: "Invalid Insihts Site ID format. Expected alphanumeric characters",
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
    SITE_ID: insightsSiteIdSchema,
    SCRIPT_URL: safeUrlSchema,
  })
);

export const appKeysSchema = z.object({});
