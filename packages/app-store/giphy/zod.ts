import { z } from "zod";

import { eventTypeAppCardZod } from "../eventTypeAppCardZod";

export const appDataSchema = eventTypeAppCardZod.merge(
  z.object({
    enabled: z.boolean().optional(),
    thankYouPage: z.string().optional(),
  })
);
