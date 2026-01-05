import { z } from "zod";

export const ZGetSubscriptionSchema = z.object({
  teamId: z.number(),
});

export type TGetSubscriptionSchema = z.infer<typeof ZGetSubscriptionSchema>;
