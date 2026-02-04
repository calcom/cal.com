import { z } from "zod";

import { eventTypeAppCardZod } from "../eventTypeAppCardZod";
import { alphanumericIdSchema, safeUrlSchema } from "@calcom/app-store/_lib/analytics-schemas";

export const appDataSchema = eventTypeAppCardZod.merge(
  z.object({
    DATABUDDY_SCRIPT_URL: safeUrlSchema,
    DATABUDDY_API_URL: safeUrlSchema,
    CLIENT_ID: alphanumericIdSchema,
  })
);

export const appKeysSchema = z.object({});
