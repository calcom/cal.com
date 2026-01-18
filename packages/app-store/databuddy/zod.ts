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

// Databuddy Client IDs are alphanumeric strings
const clientIdSchema = z
  .string()
  .transform((val) => val.trim())
  .refine((val) => val === "" || /^[A-Za-z0-9_-]+$/.test(val), {
    message: "Invalid Client ID format. Expected alphanumeric characters",
  })
  .optional()
  .default("");

export const appDataSchema = eventTypeAppCardZod.merge(
  z.object({
    DATABUDDY_SCRIPT_URL: safeUrlSchema.optional().default("https://cdn.databuddy.cc/databuddy.js").or(z.undefined()),
    DATABUDDY_API_URL: safeUrlSchema.optional().default("https://basket.databuddy.cc").or(z.undefined()),
    CLIENT_ID: clientIdSchema,
  })
);

export const appKeysSchema = z.object({});
