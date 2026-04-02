import { createDefaultAIPhoneServiceProvider } from "@calcom/features/calAIPhone";
import { PrismaAgentRepository } from "@calcom/features/calAIPhone/repositories/PrismaAgentRepository";
import { FeaturesRepository } from "@calcom/features/flags/features.repository";
import logger from "@calcom/lib/logger";
import prisma from "@calcom/prisma";
import { TRPCError } from "@trpc/server";
import type { TrpcSessionUser } from "../../../types";
import type { TTestCallInputSchema } from "./testCall.schema";

type TestCallHandlerOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TTestCallInputSchema;
};

export const testCallHandler = async ({ ctx, input }: TestCallHandlerOptions) => {
  const timeZone = ctx.user.timeZone ?? "Europe/London";
  const eventTypeId = input.eventTypeId;

  const featuresRepository = new FeaturesRepository(prisma);
  const calAIVoiceAgents = await featuresRepository.checkIfFeatureIsEnabledGlobally("cal-ai-voice-agents");
  if (!calAIVoiceAgents) {
    logger.warn("Cal.ai voice agents are disabled - skipping AI phone call scheduling");
    return;
  }

  const agentRepo = new PrismaAgentRepository(prisma);
  const agent = await agentRepo.findByIdWithCallAccess({
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
      message: "You are not authorized to test the event type. Failed to update tools for agent",
    });
  }

  return await aiService.createTestCall({
    agentId: input.agentId,
    phoneNumber: input.phoneNumber,
    userId: ctx.user.id,
    teamId: input.teamId,
    timeZone,
    eventTypeId,
  });
};
