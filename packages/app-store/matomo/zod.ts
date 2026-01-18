import { z } from "zod";

import { eventTypeAppCardZod } from "@calcom/app-store/eventTypeAppCardZod";

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

// Matomo Site IDs are positive integers
const matomoSiteIdSchema = z
  .string()
  .transform((val) => val.trim())
  .refine((val) => !val || /^[0-9]+$/.test(val), {
    message: "Invalid Matomo Site ID format. Expected a numeric ID",
  })
  .optional();

export const appDataSchema = eventTypeAppCardZod.merge(
  z.object({
    MATOMO_URL: safeUrlSchema,
    SITE_ID: matomoSiteIdSchema,
  })
);

export const appKeysSchema = z.object({});
