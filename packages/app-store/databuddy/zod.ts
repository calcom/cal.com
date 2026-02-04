import { z } from "zod";

import { eventTypeAppCardZod } from "../eventTypeAppCardZod";
import { alphanumericIdSchema, safeUrlSchema } from "@calcom/app-store/_lib/analytics-schemas";

export const appDataSchema = eventTypeAppCardZod.merge(
  z.object({
    DATABUDDY_SCRIPT_URL: safeUrlSchema.optional().default("https://cdn.databuddy.cc/databuddy.js").or(z.undefined()),
    DATABUDDY_API_URL: safeUrlSchema.optional().default("https://basket.databuddy.cc").or(z.undefined()),
    CLIENT_ID: alphanumericIdSchema.optional(),
  })
);

export const appKeysSchema = z.object({});
