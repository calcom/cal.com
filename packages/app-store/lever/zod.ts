import { z } from "zod";

import { eventTypeAppCardZod } from "../eventTypeAppCardZod";

export const appKeysSchema = z.object({
  api_key: z.string().min(1),
});

export const appDataSchema = eventTypeAppCardZod;
