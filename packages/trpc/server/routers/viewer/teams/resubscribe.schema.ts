import { z } from "zod";

export const ZResubscribeInputSchema = z.object({
  teamId: z.number(),
});

export type TResubscribeInputSchema = z.infer<typeof ZResubscribeInputSchema>;
