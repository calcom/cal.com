import { z } from "zod";

export const ZDeleteHistoryInputSchema = z.object({
  id: z.number(),
});

export type TDeleteInputSchema = z.infer<typeof ZDeleteHistoryInputSchema>;
