import { z } from "zod";

export const ZBuyCreditsSchema = z.object({
  quantity: z.number(),
});

export type TBuyCreditsSchema = z.infer<typeof ZBuyCreditsSchema>;
