import { z } from "zod";

export const ZDeleteInputSchema = z.object({
  teamId: z.number(),
});

export type TDeleteInputSchema = z.infer<typeof ZDeleteInputSchema>;
