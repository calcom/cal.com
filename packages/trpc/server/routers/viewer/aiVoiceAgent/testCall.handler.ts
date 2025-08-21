import { createDefaultAIPhoneServiceProvider } from "@calcom/features/calAIPhone";
import { FeaturesRepository } from "@calcom/features/flags/features.repository";
import logger from "@calcom/lib/logger";
import { WorkflowRepository } from "@calcom/lib/server/repository/workflow";
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

  const featuresRepository = new FeaturesRepository(prisma);
  const calAIVoiceAgents = await featuresRepository.checkIfFeatureIsEnabledGlobally("cal-ai-voice-agents");
  if (!calAIVoiceAgents) {
    logger.warn("Cal AI voice agents are disabled - skipping AI phone call scheduling");
    return;
  }

  const activeOnEventTypeIds = await WorkflowRepository.getActiveOnEventTypeIds(parseInt(input.workflowId));

  if (activeOnEventTypeIds.length === 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "No event types selected or saved in workflow activeOn",
    });
  }

  const eventTypeId = activeOnEventTypeIds[0];

  const aiService = createDefaultAIPhoneServiceProvider();

  return await aiService.createTestCall({
    agentId: input.agentId,
    phoneNumber: input.phoneNumber,
    userId: ctx.user.id,
    teamId: input.teamId,
    timeZone,
    eventTypeId,
  });
};
