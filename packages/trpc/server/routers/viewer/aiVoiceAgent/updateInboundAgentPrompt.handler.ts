import { createDefaultAIPhoneServiceProvider } from "@calcom/features/calAIPhone";
import logger from "@calcom/lib/logger";

import type { TrpcSessionUser } from "../../../types";
import type { TUpdateInboundAgentPromptInputSchema } from "./updateInboundAgentPrompt.schema";

type UpdateInboundAgentPromptHandlerOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TUpdateInboundAgentPromptInputSchema;
};

export const updateInboundAgentPromptHandler = async ({
  ctx,
  input,
}: UpdateInboundAgentPromptHandlerOptions) => {
  const log = logger.getSubLogger({ prefix: ["updateInboundAgentPromptHandler"] });

  try {
    const { agentId, eventTypeId } = input;
    const userId = ctx.user.id;
    const userTimeZone = ctx.user.timeZone || "UTC";

    const aiService = createDefaultAIPhoneServiceProvider();

    // Get current agent details to access the prompt
    const agentDetails = await aiService.getAgentWithDetails({
      id: agentId,
      userId,
    });

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
      teamId: undefined,
    });

    const result = await aiService.updateAgentConfiguration({
      id: agentId,
      userId,
      generalPrompt: updatedPrompt,
    });

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
