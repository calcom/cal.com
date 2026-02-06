import { z } from "zod";

import { eventTypeAppCardZod } from "../eventTypeAppCardZod";

// biome-ignore lint/nursery/useExplicitType: schemas
export const appDataSchema = eventTypeAppCardZod;

// biome-ignore lint/nursery/useExplicitType: schemas
export const appKeysSchema = z.object({
  apiKey: z.string().min(1),
});
