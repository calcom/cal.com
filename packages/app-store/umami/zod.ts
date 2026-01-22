import { z } from "zod";

import { eventTypeAppCardZod } from "@calcom/app-store/eventTypeAppCardZod";

export const appDataSchema = eventTypeAppCardZod.merge(
  z.object({
    SITE_ID: z.string().optional(),
    SCRIPT_URL: z.string().optional().default("https://us.umami.is/script.js").or(z.undefined()),
  })
);

export const appKeysSchema = z.object({});
