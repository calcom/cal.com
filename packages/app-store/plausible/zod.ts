import { z } from "zod";

import { eventTypeAppCardZod } from "../eventTypeAppCardZod";

export const appDataSchema = eventTypeAppCardZod.merge(
  z.object({
    PLAUSIBLE_URL: z.string().optional().default("https://plausible.io/js/script.js").or(z.undefined()),
    trackingId: z.string().default("").optional(),
  })
);

export const appKeysSchema = z.object({});
