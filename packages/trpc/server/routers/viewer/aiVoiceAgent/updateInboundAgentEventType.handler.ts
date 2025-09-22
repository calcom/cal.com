import { createDefaultAIPhoneServiceProvider } from "@calcom/features/calAIPhone";
import logger from "@calcom/lib/logger";
import { PrismaAgentRepository } from "@calcom/lib/server/repository/PrismaAgentRepository";

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

    console.log("agentDetails", agentDetails);

    if (!agentDetails.retellData.generalPrompt) {
      throw new Error("Agent configuration not found");
    }

    // Replace placeholders in the prompt with the specific event type ID
    const updatedPrompt = agentDetails.retellData.generalPrompt
      .replace(/check_availability_\d+/g, `check_availability_${eventTypeId}`)
      .replace(/book_appointment_\d+/g, `book_appointment_${eventTypeId}`)
      .replace(/check_availability_\{\{eventTypeId\}\}/g, `check_availability_${eventTypeId}`)
      .replace(/book_appointment_\{\{eventTypeId\}\}/g, `book_appointment_${eventTypeId}`);

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
      generalPrompt: updatedPrompt,
    });

    await PrismaAgentRepository.updateEventTypeId({
      agentId,
      eventTypeId,
    });

    console.log("result", result);

    log.info("Inbound agent prompt updated", {
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
