import { z } from "zod";

import { eventTypeAppCardZod } from "../eventTypeAppCardZod";

export const appDataSchema = eventTypeAppCardZod.merge(
  z.object({
    DATABUDDY_SCRIPT_URL: z
      .string()
      .optional()
      .default("https://cdn.databuddy.cc/databuddy.js")
      .or(z.undefined()),
    DATABUDDY_API_URL: z.string().optional().default("https://basket.databuddy.cc").or(z.undefined()),
    CLIENT_ID: z.string().default("").optional(),
  })
);

export const appKeysSchema = z.object({});
