import { CalIdWorkflowRepository } from "@calcom/lib/server/repository/workflow.calid";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import type { TCalIdGetVerifiedNumbersInputSchema } from "./getVerifiedNumbers.schema";

type CalIdGetVerifiedNumbersOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TCalIdGetVerifiedNumbersInputSchema;
};

export const calIdGetVerifiedNumbersHandler = async ({ ctx, input }: CalIdGetVerifiedNumbersOptions) => {
  return await CalIdWorkflowRepository.getVerifiedNumbers({
    userId: ctx.user.id,
    calIdTeamId: input.calIdTeamId,
  });
};
