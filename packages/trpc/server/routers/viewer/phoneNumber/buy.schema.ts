import { z } from "zod";

export const ZBuyInputSchema = z.object({
  teamId: z.number().optional(),
  agentId: z.string(),
  workflowId: z.string(),
  googleAds: z
    .object({
      gclid: z.string().optional(),
      campaignId: z.string().optional(),
    })
    .optional(),
});

export type TBuyInputSchema = z.infer<typeof ZBuyInputSchema>;
