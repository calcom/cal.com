import { WorkflowRepository } from "@calcom/lib/server/repository/workflow";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import type { TGetVerifiedEmailsInputSchema } from "./getVerifiedEmails.schema";

type GetVerifiedEmailsOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TGetVerifiedEmailsInputSchema;
};

export const getVerifiedEmailsHandler = async ({ ctx, input }: GetVerifiedEmailsOptions) => {
  return await WorkflowRepository.getVerifiedEmails({
    userId: ctx.user.id,
    userEmail: ctx.user.email,
    teamId: input.teamId,
  });
};
