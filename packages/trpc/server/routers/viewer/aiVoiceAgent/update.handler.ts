import { createDefaultAIPhoneServiceProvider } from "@calcom/features/calAIPhone";
import type { RetellLLMGeneralTools } from "@calcom/features/calAIPhone/providers/retellAI/types";
import type { TrpcSessionUser } from "../../../types";
import type { TUpdateInputSchema } from "./update.schema";

type UpdateHandlerOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TUpdateInputSchema;
};

export const updateHandler = async ({ ctx, input }: UpdateHandlerOptions) => {
  const { id, teamId, name, outboundEventTypeId, ...retellUpdates } = input;

  const aiService = createDefaultAIPhoneServiceProvider();
  const userId = ctx.user.id;
  const userTimeZone = ctx.user.timeZone || "UTC";

  const updatedPrompt = retellUpdates.generalPrompt ?? undefined;

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
    outboundEventTypeId,
    timeZone: userTimeZone,
  });
};
