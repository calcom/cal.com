import { z } from "zod";

export const ZGetAbuseRuleDetailsInputSchema = z.object({
  id: z.string(),
});

export type TGetAbuseRuleDetailsInputSchema = z.infer<typeof ZGetAbuseRuleDetailsInputSchema>;
