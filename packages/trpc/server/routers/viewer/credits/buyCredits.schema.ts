import { z } from "zod";

export const ZBuyCreditsSchema = z.object({
  quantity: z.number(),
  teamId: z.number().optional(),
});

export type TBuyCreditsSchema = z.infer<typeof ZBuyCreditsSchema>;
