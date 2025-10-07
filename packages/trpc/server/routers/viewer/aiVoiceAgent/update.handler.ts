import { createDefaultAIPhoneServiceProvider } from "@calcom/features/calAIPhone";
import type { RetellLLMGeneralTools } from "@calcom/features/calAIPhone/providers/retellAI/types";
import { replaceEventTypePlaceholders } from "@calcom/features/ee/workflows/components/agent-configuration/utils/promptUtils";
import { PrismaAgentRepository } from "@calcom/lib/server/repository/PrismaAgentRepository";

import type { TrpcSessionUser } from "../../../types";
import type { TUpdateInputSchema } from "./update.schema";

type UpdateHandlerOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TUpdateInputSchema;
};

export const updateHandler = async ({ ctx, input }: UpdateHandlerOptions) => {
  const { id, teamId, name, enabled, eventTypeId, ...retellUpdates } = input;

  const aiService = createDefaultAIPhoneServiceProvider();
  const userId = ctx.user.id;
  const userTimeZone = ctx.user.timeZone || "UTC";

  let updatedPrompt = retellUpdates.generalPrompt ?? undefined;

  // If eventTypeId is provided, update tools and replace placeholders in prompt
  if (eventTypeId) {
    // Get agent details to retrieve the provider agent ID
    const agentDetails = await aiService.getAgentWithDetails({
      id,
      userId,
      teamId,
    });

    if (agentDetails?.providerAgentId) {
      // Update tools with the new event type
      await aiService.updateToolsFromAgentId(agentDetails.providerAgentId, {
        eventTypeId,
        timeZone: userTimeZone,
        userId,
        teamId,
      });
    }

    // Replace placeholders in the prompt if a prompt is being updated
    if (updatedPrompt) {
      updatedPrompt = replaceEventTypePlaceholders(updatedPrompt, eventTypeId);
    } else if (agentDetails?.retellData.generalPrompt) {
      // If no new prompt provided but event type changed, update existing prompt
      updatedPrompt = replaceEventTypePlaceholders(agentDetails.retellData.generalPrompt, eventTypeId);
    }

    // Update the event type in the database
    await PrismaAgentRepository.updateEventTypeId({
      agentId: id,
      eventTypeId,
    });
  }

  return await aiService.updateAgentConfiguration({
    id,
    userId,
    teamId,
    name,
    generalPrompt: updatedPrompt,
    beginMessage: retellUpdates.beginMessage ?? undefined,
    generalTools: retellUpdates.generalTools as RetellLLMGeneralTools,
    voiceId: retellUpdates.voiceId,
    language: retellUpdates.language,
  });
};
