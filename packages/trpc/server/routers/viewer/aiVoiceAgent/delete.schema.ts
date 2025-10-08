import { z } from "zod";

export const ZDeleteInputSchema = z.object({
  id: z.string(),
  teamId: z.number().optional(),
});

export type TDeleteInputSchema = z.infer<typeof ZDeleteInputSchema>;
