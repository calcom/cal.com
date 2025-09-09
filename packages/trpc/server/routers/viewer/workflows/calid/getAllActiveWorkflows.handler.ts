import { isCalIdTeamMember } from "@calcom/lib/server/queries/teams";
import { eventTypeMetaDataSchemaWithTypedApps } from "@calcom/prisma/zod-utils";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import { TRPCError } from "@trpc/server";

import { getAllCalIdWorkflowsFromEventType, getCalIdEventTypeWorkflows } from "../util.calid";
import type { TCalIdGetAllActiveWorkflowsInputSchema } from "./getAllActiveWorkflows.schema";

type CalIdGetAllActiveWorkflowsOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TCalIdGetAllActiveWorkflowsInputSchema;
};

export const calIdGetAllActiveWorkflowsHandler = async ({
  input,
  ctx,
}: CalIdGetAllActiveWorkflowsOptions) => {
  const { eventType } = input;
  const workflows = await getCalIdEventTypeWorkflows(ctx.user.id, eventType.id);
  const completeEventType = {
    calIdWorkflows: workflows,
    calIdTeamId: eventType.calIdTeamId,
    userId: eventType.userId,
    parent: eventType.parent,
    metadata: eventType.metadata,
  };

  if (eventType.userId && eventType.userId !== ctx.user.id) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
    });
  }

  if (eventType.calIdTeamId) {
    const team = await isCalIdTeamMember(ctx.user?.id, eventType.calIdTeamId);
    if (!team) throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  if (eventType.parent?.calIdTeamId) {
    const team = await isCalIdTeamMember(ctx.user?.id, eventType.parent?.calIdTeamId);
    if (!team) throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  const allActiveWorkflows = await getAllCalIdWorkflowsFromEventType(
    {
      ...completeEventType,
      metadata: eventTypeMetaDataSchemaWithTypedApps.parse(eventType.metadata),
    },
    eventType.userId
  );

  return allActiveWorkflows;
};
