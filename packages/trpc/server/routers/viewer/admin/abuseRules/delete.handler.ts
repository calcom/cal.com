import { getAbuseRulesRepository } from "@calcom/features/abuse-rules/di/AbuseRulesRepository.container";

import type { TrpcSessionUser } from "../../../../types";
import type { TBulkDeleteAbuseRulesInputSchema, TDeleteAbuseRuleInputSchema } from "./delete.schema";

type DeleteAbuseRuleOptions = {
  ctx: { user: NonNullable<TrpcSessionUser> };
  input: TDeleteAbuseRuleInputSchema;
};

export const deleteAbuseRuleHandler = async ({ ctx, input }: DeleteAbuseRuleOptions) => {
  const repository = getAbuseRulesRepository();
  await repository.delete(input.id, ctx.user.id);
  return { id: input.id };
};

type BulkDeleteAbuseRulesOptions = {
  ctx: { user: NonNullable<TrpcSessionUser> };
  input: TBulkDeleteAbuseRulesInputSchema;
};

export const bulkDeleteAbuseRulesHandler = async ({ ctx, input }: BulkDeleteAbuseRulesOptions) => {
  const repository = getAbuseRulesRepository();
  await repository.deleteMany(input.ids, ctx.user.id);
  return { ids: input.ids };
};
