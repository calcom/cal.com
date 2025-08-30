import { createDefaultAIPhoneServiceProvider } from "@calcom/features/calAIPhone";
import type { RetellLLMGeneralTools } from "@calcom/features/calAIPhone/providers/retellAI/types";

import type { TrpcSessionUser } from "../../../types";
import type { TCreateInputSchema } from "./create.schema";

type CreateHandlerOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TCreateInputSchema;
};

export const createHandler = async ({ ctx, input }: CreateHandlerOptions) => {
  const { teamId, name, workflowStepId, ...retellConfig } = input;

  const aiService = createDefaultAIPhoneServiceProvider();

  return await aiService.createAgent({
    name,
    userId: ctx.user.id,
    teamId,
    workflowStepId,
    generalPrompt: retellConfig.generalPrompt,
    beginMessage: retellConfig.beginMessage,
    generalTools: retellConfig.generalTools as RetellLLMGeneralTools,
    userTimeZone: ctx.user.timeZone,
  });
};
