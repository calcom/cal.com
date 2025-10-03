import { CalIdWorkflowRepository } from "@calcom/lib/server/repository/workflow.calid";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import type { TCalIdGetVerifiedEmailsInputSchema } from "./getVerifiedEmails.schema";

type CalIdGetVerifiedEmailsOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TCalIdGetVerifiedEmailsInputSchema;
};

export const calIdGetVerifiedEmailsHandler = async ({ ctx, input }: CalIdGetVerifiedEmailsOptions) => {
  return await CalIdWorkflowRepository.getVerifiedEmails({
    userId: ctx.user.id,
    userEmail: ctx.user.email,
    calIdTeamId: input.calIdTeamId,
  });
};
