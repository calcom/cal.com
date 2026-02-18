import { duplicateWorkflow } from "@calcom/features/ee/workflows/lib/duplicateWorkflow";
import { isAuthorized } from "@calcom/features/ee/workflows/lib/isAuthorized";
import { prisma } from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import { TRPCError } from "@trpc/server";

import type { TDuplicateWorkflowInputSchema } from "./duplicate.schema";

type DuplicateOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TDuplicateWorkflowInputSchema;
};

export const duplicateWorkflowHandler = async ({ ctx, input }: DuplicateOptions) => {
  const { id, targetTeamId } = input;

  const workflow = await prisma.workflow.findUnique({
    where: { id },
    select: {
      id: true,
      teamId: true,
      userId: true,
    },
  });

  if (!workflow) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Workflow not found" });
  }

  // Check the user is authorized to read the source workflow
  const isUserAuthorized = await isAuthorized(workflow, ctx.user.id, "workflow.read");
  if (!isUserAuthorized) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  const newWorkflow = await duplicateWorkflow({
    workflowId: id,
    targetTeamId,
    currentUserId: ctx.user.id,
  });

  return { workflow: newWorkflow };
};
