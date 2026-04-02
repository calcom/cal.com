import { createDefaultAIPhoneServiceProvider } from "@calcom/features/calAIPhone";
import logger from "@calcom/lib/logger";
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

  const aiService = createDefaultAIPhoneServiceProvider();

  const agent = await aiService.getAgentWithDetails({
    id: input.agentId,
    userId: ctx.user.id,
    teamId: input.teamId,
  });

  if (!agent?.providerAgentId) {
    logger.error(`Agent not found or access denied for agentId ${input.agentId}, userId ${ctx.user.id}`);
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Agent not found or you don't have permission to access this agent",
    });
  }

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
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to configure agent for web call",
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
