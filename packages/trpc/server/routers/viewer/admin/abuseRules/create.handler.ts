import { getAbuseRulesRepository } from "@calcom/features/abuse-rules/di/AbuseRulesRepository.container";

import type { TrpcSessionUser } from "../../../../types";
import type { TCreateAbuseRuleInputSchema } from "./create.schema";

type CreateAbuseRuleOptions = {
  ctx: { user: NonNullable<TrpcSessionUser> };
  input: TCreateAbuseRuleInputSchema;
};

export const createAbuseRuleHandler = async ({ ctx, input }: CreateAbuseRuleOptions) => {
  const repository = getAbuseRulesRepository();
  return repository.create(input, ctx.user.id);
};
