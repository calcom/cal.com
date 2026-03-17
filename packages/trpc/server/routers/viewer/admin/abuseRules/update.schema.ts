import { z } from "zod";

import { ZConditionSchema } from "./shared.schema";

export const ZUpdateAbuseRuleInputSchema = z.object({
  id: z.string(),
  matchAll: z.boolean().optional(),
  weight: z.number().int().min(0).max(100).optional(),
  autoLock: z.boolean().optional(),
  enabled: z.boolean().optional(),
  description: z.string().max(500).nullable().optional(),
  conditions: z.array(ZConditionSchema).min(1).optional(),
});

export type TUpdateAbuseRuleInputSchema = z.infer<typeof ZUpdateAbuseRuleInputSchema>;
