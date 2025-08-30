import { z } from "zod";

export const ZEventTypeOrderInputSchema = z.object({
  ids: z.array(z.number()),
});

export type TEventTypeOrderInputSchema = z.infer<typeof ZEventTypeOrderInputSchema>;
