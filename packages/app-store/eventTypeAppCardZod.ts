import { z } from "zod";


export const eventTypeAppCardZod = z.object({
  enabled: z.boolean().optional(),
});
