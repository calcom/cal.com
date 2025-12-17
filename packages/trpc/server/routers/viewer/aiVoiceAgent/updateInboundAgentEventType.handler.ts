import { createDefaultAIPhoneServiceProvider } from "@calcom/features/calAIPhone";
import { PrismaAgentRepository } from "@calcom/features/calAIPhone/repositories/PrismaAgentRepository";
import { replaceEventTypePlaceholders } from "@calcom/features/ee/workflows/components/agent-configuration/utils/promptUtils";
import logger from "@calcom/lib/logger";
import prisma from "@calcom/prisma";

import type { TrpcSessionUser } from "../../../types";
import type { TUpdateInboundAgentEventTypeInputSchema } from "./updateInboundAgentEventType.schema";

type UpdateInboundAgentEventTypeHandlerOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TUpdateInboundAgentEventTypeInputSchema;
};

export const updateInboundAgentEventTypeHandler = async ({
  ctx,
  input,
}: UpdateInboundAgentEventTypeHandlerOptions) => {
  const log = logger.getSubLogger({ prefix: ["updateInboundAgentEventTypeHandler"] });

  try {
    const { agentId, eventTypeId, teamId } = input;
    const userId = ctx.user.id;
    const userTimeZone = ctx.user.timeZone || "UTC";

    const aiService = createDefaultAIPhoneServiceProvider();

    const agentDetails = await aiService.getAgentWithDetails({
      id: agentId,
      userId,
      teamId,
    });

    if (!agentDetails.retellData.generalPrompt) {
      throw new Error("Agent configuration not found");
    }

    // Replace placeholders in the prompt with the specific event type ID
    const updatedPrompt = replaceEventTypePlaceholders(agentDetails.retellData.generalPrompt, eventTypeId);

    // Update tools and prompt using existing updateAgentConfiguration method
    await aiService.updateToolsFromAgentId(agentDetails.retellData.agentId, {
      eventTypeId,
      timeZone: userTimeZone,
      userId,
      teamId,
    });

    const result = await aiService.updateAgentConfiguration({
      id: agentId,
      userId,
      teamId,
      generalPrompt: updatedPrompt,
    });

    const agentRepo = new PrismaAgentRepository(prisma);
    await agentRepo.updateEventTypeId({
      agentId,
      eventTypeId,
    });

    return {
      success: true,
      message: result.message,
    };
  } catch (error) {
    log.error("Failed to update inbound agent prompt", { error });
    throw error;
  }
};
