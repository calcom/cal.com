import { z } from "zod";

import { eventTypeAppCardZod } from "../eventTypeAppCardZod";

export const appDataSchema = eventTypeAppCardZod.merge(
  z.object({
    PLAUSIBLE_URL: z.string().optional().default("plausible.io").or(z.undefined()),
    trackingId: z.string().default("").optional(),
  })
);

export const appKeysSchema = z.object({});
