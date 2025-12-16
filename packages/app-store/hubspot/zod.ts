import { z } from "zod";

import { eventTypeAppCardZod } from "../eventTypeAppCardZod";

export const appDataSchema = eventTypeAppCardZod.extend({
  ignoreGuests: z.boolean().optional(),
  skipContactCreation: z.boolean().optional(),
});

export const appKeysSchema = z.object({
  client_id: z.string().min(1),
  client_secret: z.string().min(1),
});
