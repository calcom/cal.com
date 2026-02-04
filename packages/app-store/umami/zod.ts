import { z } from "zod";

import { eventTypeAppCardZod } from "@calcom/app-store/eventTypeAppCardZod";

import { safeUrlSchema } from "@calcom/app-store/_lib/analytics-schemas";

// Umami Website IDs: UUID in v2 (e.g., 4fb7fa4c-5b46-438d-94b3-3a8fb9bc2e8b) or numeric in v1
const umamiSiteIdSchema = z
  .string()
  .transform((val) => val.trim().toLowerCase())
  .refine(
    (val) =>
      !val ||
      /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(val) ||
      /^[0-9]+$/.test(val),
    {
      message: "Invalid Umami Website ID format. Expected UUID or numeric ID",
    }
  )
  .optional();

export const appDataSchema = eventTypeAppCardZod.merge(
  z.object({
    SITE_ID: umamiSiteIdSchema,
    SCRIPT_URL: safeUrlSchema.default("https://cloud.umami.is/script.js").or(z.undefined()),
  })
);

export const appKeysSchema = z.object({});
