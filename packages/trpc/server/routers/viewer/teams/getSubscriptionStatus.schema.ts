import { z } from "zod";

export const ZGetSubscriptionStatusInputSchema = z.object({
  teamId: z.number(),
});

export type TGetSubscriptionStatusInputSchema = z.infer<typeof ZGetSubscriptionStatusInputSchema>;
