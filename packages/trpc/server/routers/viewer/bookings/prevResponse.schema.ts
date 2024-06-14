import { z } from "zod";

export const ZPrevResponseInputSchema = z.object({
  eventTypeId: z.number(),
});

export type TPrevResponseInputSchema = z.infer<typeof ZPrevResponseInputSchema>;
