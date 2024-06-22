import z from "zod";

export const Credential = z.object({
  id: z.number(),
  userId: z.number().optional().nullable(),
  teamId: z.number().optional().nullable(),
  type: z.string(),
  subscriptionId: z.string().optional().nullable(),
  appId: z.string().optional().nullable(),
  paymentStatus: z.string().optional().nullable(),
  billingCycleStart: z.number().optional().nullable(),
  invalid: z.boolean().optional().nullable(),
});
