import { z } from "zod";

import { eventTypeAppCardZod } from "@calcom/app-store/eventTypeAppCardZod";
import { numericIdSchema, safeUrlSchema } from "@calcom/app-store/_lib/analytics-schemas";

export const appDataSchema = eventTypeAppCardZod.merge(
  z.object({
    MATOMO_URL: safeUrlSchema,
    SITE_ID: numericIdSchema,
  })
);

export const appKeysSchema = z.object({});
