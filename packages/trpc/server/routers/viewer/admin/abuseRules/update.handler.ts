import { getAbuseRulesRepository } from "@calcom/features/abuse-rules/di/AbuseRulesRepository.container";

import type { TrpcSessionUser } from "../../../../types";
import type { TUpdateAbuseRuleInputSchema } from "./update.schema";

type UpdateAbuseRuleOptions = {
  ctx: { user: NonNullable<TrpcSessionUser> };
  input: TUpdateAbuseRuleInputSchema;
};

export const updateAbuseRuleHandler = async ({ ctx, input }: UpdateAbuseRuleOptions) => {
  const { id, ...data } = input;
  const repository = getAbuseRulesRepository();
  return repository.update(id, data, ctx.user.id);
};
