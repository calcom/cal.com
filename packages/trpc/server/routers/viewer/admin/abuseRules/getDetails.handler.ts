import { getAbuseRulesRepository } from "@calcom/features/abuse-rules/di/AbuseRulesRepository.container";

import type { TGetAbuseRuleDetailsInputSchema } from "./getDetails.schema";

type GetAbuseRuleDetailsOptions = {
  input: TGetAbuseRuleDetailsInputSchema;
};

export const getAbuseRuleDetailsHandler = async ({ input }: GetAbuseRuleDetailsOptions) => {
  const repository = getAbuseRulesRepository();

  const [rule, auditLog] = await Promise.all([
    repository.findByIdIncludeConditions(input.id),
    repository.findAuditLog(input.id),
  ]);

  return { ...rule, auditLog };
};
