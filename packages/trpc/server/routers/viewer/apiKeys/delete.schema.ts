import { z } from "zod";

export const ZDeleteInputSchema = z.object({
  id: z.string(),
  eventTypeId: z.number().optional(),
});

export type TDeleteInputSchema = z.infer<typeof ZDeleteInputSchema>;
