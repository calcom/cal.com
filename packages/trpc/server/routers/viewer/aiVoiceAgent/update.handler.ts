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
  const { id, teamId, name, enabled, ...retellUpdates } = input;

  const aiService = createDefaultAIPhoneServiceProvider();

  return await aiService.updateAgentConfiguration({
    id,
    userId: ctx.user.id,
    teamId,
    name,
    generalPrompt: retellUpdates.generalPrompt ?? undefined,
    beginMessage: retellUpdates.beginMessage ?? undefined,
    generalTools: retellUpdates.generalTools as RetellLLMGeneralTools,
    voiceId: retellUpdates.voiceId,
  });
};
