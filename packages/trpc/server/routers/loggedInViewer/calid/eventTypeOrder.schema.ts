import { z } from "zod";

export const ZCalIdEventTypeOrderInputSchema = z.object({
  ids: z.array(z.number()),
});

export type TCalIdEventTypeOrderInputSchema = z.infer<typeof ZCalIdEventTypeOrderInputSchema>;
