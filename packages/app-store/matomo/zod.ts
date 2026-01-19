import { z } from "zod";

import { eventTypeAppCardZod } from "@calcom/app-store/eventTypeAppCardZod";

import { numericIdSchema, safeUrlSchema } from "../_lib/analytics-schemas";

export const appDataSchema = eventTypeAppCardZod.merge(
  z.object({
    MATOMO_URL: safeUrlSchema.optional(),
    SITE_ID: numericIdSchema.optional(),
  })
);

export const appKeysSchema = z.object({});
