import { isTeamMember } from "@calcom/lib/server/queries";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import { TRPCError } from "@trpc/server";

import type { TGetAllActiveWorkflowsInputSchema } from "./getAllActiveWorkflows.schema";
import { getAllWorkflowsFromEventType } from "./util";

type GetAllActiveWorkflowsOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TGetAllActiveWorkflowsInputSchema;
};

export const getAllActiveWorkflowsHandler = async ({ input, ctx }: GetAllActiveWorkflowsOptions) => {
  const { eventType } = input;

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

  const allActiveWorkflows = await getAllWorkflowsFromEventType(eventType, eventType.userId);

  return allActiveWorkflows;
};
