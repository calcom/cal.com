import { z } from "zod";

import { eventTypeAppCardZod } from "../eventTypeAppCardZod";

export const appKeysSchema = z.object({
  client_id: z.string(),
  client_secret: z.string(),
});

export const appDataSchema = eventTypeAppCardZod;
