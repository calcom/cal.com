import { WorkflowRepository } from "@calcom/features/ee/workflows/repositories/WorkflowRepository";
import { addPermissionsToWorkflow } from "@calcom/lib/server/repository/workflow-permissions";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import { TRPCError } from "@trpc/server";

import type { TGetInputSchema } from "./get.schema";
import { isAuthorized } from "./util";

type GetOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TGetInputSchema;
};

export const getHandler = async ({ ctx, input }: GetOptions) => {
  const workflow = await WorkflowRepository.getById({ id: input.id });

  const isUserAuthorized = await isAuthorized(workflow, ctx.user.id, "workflow.read");

  if (!isUserAuthorized) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
    });
  }

  if (!workflow) {
    return workflow;
  }

  // Add permissions to the workflow
  const workflowWithPermissions = await addPermissionsToWorkflow(workflow, ctx.user.id);

  return workflowWithPermissions;
};
