import { z } from "zod";

import { eventTypeAppCardZod } from "@calcom/app-store/eventTypeAppCardZod";
import { alphanumericIdSchema, safeUrlSchema } from "@calcom/app-store/_lib/analytics-schemas";

export const appDataSchema = eventTypeAppCardZod.merge(
  z.object({
    SITE_ID: alphanumericIdSchema,
    SCRIPT_URL: safeUrlSchema,
  })
);

export const appKeysSchema = z.object({});
