import { z } from "zod";

import { eventTypeAppCardZod } from "../eventTypeAppCardZod";

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
  }, { message: "Invalid URL format. Must be a valid http or https URL" });

// Domain schema for Plausible tracking (e.g., example.com, sub.example.com)
const domainSchema = z
  .string()
  .transform((val) => val.trim().toLowerCase())
  .refine((val) => val === "" || /^[a-z0-9][a-z0-9.-]*[a-z0-9]$|^[a-z0-9]$/.test(val), {
    message: "Invalid domain format. Expected format: example.com",
  })
;

export const appDataSchema = eventTypeAppCardZod.merge(
  z.object({
    PLAUSIBLE_URL: safeUrlSchema.optional().default("https://plausible.io/js/script.js").or(z.undefined()),
    trackingId: domainSchema,
  })
);

export const appKeysSchema = z.object({});
