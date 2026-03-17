import { z } from "zod";

export const ZListAbuseRulesInputSchema = z.object({
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0),
});

export type TListAbuseRulesInputSchema = z.infer<typeof ZListAbuseRulesInputSchema>;
