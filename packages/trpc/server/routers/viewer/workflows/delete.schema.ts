import { z } from "zod";

export const ZDeleteInputSchema = z.object({
  id: z.number(),
});

export type TDeleteInputSchema = z.infer<typeof ZDeleteInputSchema>;
