import { z } from "zod";

import { ABUSE_RULE_FIELDS, ABUSE_RULE_OPERATORS } from "@calcom/features/abuse-scoring/lib/constants";

export const ZConditionSchema = z.object({
  field: z.enum(ABUSE_RULE_FIELDS),
  operator: z.enum(ABUSE_RULE_OPERATORS),
  value: z.string().min(1).max(500),
});
