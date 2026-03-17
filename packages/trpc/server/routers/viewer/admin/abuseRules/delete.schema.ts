import { z } from "zod";

export const ZDeleteAbuseRuleInputSchema = z.object({
  id: z.string(),
});

export type TDeleteAbuseRuleInputSchema = z.infer<typeof ZDeleteAbuseRuleInputSchema>;

export const ZBulkDeleteAbuseRulesInputSchema = z.object({
  ids: z.array(z.string()).min(1),
});

export type TBulkDeleteAbuseRulesInputSchema = z.infer<typeof ZBulkDeleteAbuseRulesInputSchema>;
