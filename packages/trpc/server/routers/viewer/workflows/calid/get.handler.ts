import { CalIdWorkflowRepository as WorkflowRepository } from "@calcom/lib/server/repository/workflow.calid";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import { TRPCError } from "@trpc/server";

import { isCalIdAuthorized } from "../util.calid";
import type { TCalIdGetInputSchema } from "./get.schema";

type CalIdGetOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TCalIdGetInputSchema;
};

export const calIdGetHandler = async ({ ctx, input }: CalIdGetOptions) => {
  const workflow = await WorkflowRepository.getById({ id: input.id });

  const isUserAuthorized = await isCalIdAuthorized(workflow, ctx.user.id);

  if (!isUserAuthorized) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
    });
  }

  return workflow;
};
