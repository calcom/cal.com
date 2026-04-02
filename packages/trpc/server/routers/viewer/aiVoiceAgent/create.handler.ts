import { createDefaultAIPhoneServiceProvider } from "@calcom/features/calAIPhone";
import type { RetellLLMGeneralTools } from "@calcom/features/calAIPhone/providers/retellAI/types";
import { calAIPhoneWorkflowTemplates } from "@calcom/features/calAIPhone/workflowTemplates";
import type { TrpcSessionUser } from "../../../types";
import type { TCreateInputSchema } from "./create.schema";

type CreateHandlerOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TCreateInputSchema;
};

export const createHandler = async ({ ctx, input }: CreateHandlerOptions) => {
  const { teamId, name, workflowStepId, templateWorkflowId, ...retellConfig } = input;

  const aiService = createDefaultAIPhoneServiceProvider();

  const generalPrompt = templateWorkflowId
    ? calAIPhoneWorkflowTemplates?.[templateWorkflowId as keyof typeof calAIPhoneWorkflowTemplates]
        ?.generalPrompt
    : undefined;

  return await aiService.createOutboundAgent({
    name,
    userId: ctx.user.id,
    teamId,
    workflowStepId,
    generalPrompt: generalPrompt ?? retellConfig.generalPrompt,
    beginMessage: retellConfig.beginMessage,
    generalTools: retellConfig.generalTools as RetellLLMGeneralTools,
    userTimeZone: ctx.user.timeZone,
  });
};
