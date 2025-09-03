import { createDefaultAIPhoneServiceProvider } from "@calcom/features/calAIPhone";
import logger from "@calcom/lib/logger";
import { PrismaAgentRepository } from "@calcom/lib/server/repository/PrismaAgentRepository";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../types";
import type { TCreateWebCallInputSchema } from "./createWebCall.schema";

type CreateWebCallHandlerOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TCreateWebCallInputSchema;
};

export const createWebCallHandler = async ({ ctx, input }: CreateWebCallHandlerOptions) => {
  const timeZone = ctx.user.timeZone ?? "Europe/London";
  const eventTypeId = input.eventTypeId;

  const agent = await PrismaAgentRepository.findByIdWithCallAccess({
    id: input.agentId,
    userId: ctx.user.id,
  });

  if (!agent?.providerAgentId) {
    logger.error(`Agent not found with agentId ${input.agentId}`);
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Agent not found",
    });
  }

  const aiService = createDefaultAIPhoneServiceProvider();

  try {
    await aiService.updateToolsFromAgentId(agent.providerAgentId, {
      eventTypeId,
      timeZone,
      userId: ctx.user.id,
      teamId: input.teamId,
    });
  } catch (error) {
    logger.error(`Failed to update tools for agent ${agent.providerAgentId}: ${error}`);
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message:
        "You are not authorized to create web call with this event type. Failed to update tools for agent",
    });
  }

  return await aiService.createWebCall({
    agentId: input.agentId,
    userId: ctx.user.id,
    teamId: input.teamId,
    timeZone,
    eventTypeId,
  });
};
