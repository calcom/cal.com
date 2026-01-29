import { z } from "zod";

export const ZBillingStatusInputSchema = z
  .object({
    ownerOnly: z.boolean().optional(),
  })
  .optional();

export type TBillingStatusInputSchema = z.infer<typeof ZBillingStatusInputSchema>;
