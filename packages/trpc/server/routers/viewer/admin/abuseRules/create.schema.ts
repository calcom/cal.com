import { z } from "zod";

import { ZConditionSchema } from "./shared.schema";

export const ZCreateAbuseRuleInputSchema = z.object({
  matchAll: z.boolean().default(true),
  weight: z.number().int().min(0).max(100),
  autoLock: z.boolean().default(false),
  enabled: z.boolean().default(true),
  description: z.string().max(500).optional(),
  conditions: z.array(ZConditionSchema).min(1),
});

export type TCreateAbuseRuleInputSchema = z.infer<typeof ZCreateAbuseRuleInputSchema>;
