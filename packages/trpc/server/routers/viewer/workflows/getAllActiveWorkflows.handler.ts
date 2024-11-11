import { isTeamMember } from "@calcom/lib/server/queries";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import { TRPCError } from "@trpc/server";

import type { TGetAllActiveWorkflowsInputSchema } from "./getAllActiveWorkflows.schema";
import { getAllWorkflowsFromEventType, getEventTypeWorkflows } from "./util";

type GetAllActiveWorkflowsOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TGetAllActiveWorkflowsInputSchema;
};

export const getAllActiveWorkflowsHandler = async ({ input, ctx }: GetAllActiveWorkflowsOptions) => {
  const { eventType } = input;
  const workflows = await getEventTypeWorkflows(ctx.user.id, eventType.id);
  const completeEventType = {
    workflows,
    teamId: eventType.teamId,
    userId: eventType.userId,
    parent: eventType.parent,
    metadata: eventType.metadata,
  };

  if (eventType.userId && eventType.userId !== ctx.user.id) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
    });
  }

  if (eventType.teamId) {
    const team = await isTeamMember(ctx.user?.id, eventType.teamId);
    if (!team) throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  if (eventType.parent?.teamId) {
    const team = await isTeamMember(ctx.user?.id, eventType.parent?.teamId);
    if (!team) throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  const allActiveWorkflows = await getAllWorkflowsFromEventType(completeEventType, eventType.userId);

  return allActiveWorkflows;
};
