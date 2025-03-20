import { WorkflowRepository } from "@calcom/lib/server/repository/workflow";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import type { TGetVerifiedNumbersInputSchema } from "./getVerifiedNumbers.schema";

type GetVerifiedNumbersOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TGetVerifiedNumbersInputSchema;
};

export const getVerifiedNumbersHandler = async ({ ctx, input }: GetVerifiedNumbersOptions) => {
  return await WorkflowRepository.getVerifiedNumbers({
    userId: ctx.user.id,
    teamId: input.teamId,
  });
};
