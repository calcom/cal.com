import { z } from "zod";

export const ZSwitchBillingPeriodInputSchema = z.object({
  teamId: z.number(),
  targetPeriod: z.enum(["MONTHLY", "ANNUALLY"]),
});

export type TSwitchBillingPeriodInputSchema = z.infer<typeof ZSwitchBillingPeriodInputSchema>;
