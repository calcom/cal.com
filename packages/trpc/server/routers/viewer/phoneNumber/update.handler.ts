import { createDefaultAIPhoneServiceProvider } from "@calcom/features/calAIPhone";

import type { TUpdateInputSchema } from "./update.schema";

type UpdateHandlerOptions = {
  ctx: {
    user: { id: number };
  };
  input: TUpdateInputSchema;
};

export const updateHandler = async ({ ctx: { user: loggedInUser }, input }: UpdateHandlerOptions) => {
  const { phoneNumber, inboundAgentId, outboundAgentId, teamId } = input;
  const aiService = createDefaultAIPhoneServiceProvider();

  return await aiService.updatePhoneNumberWithAgents({
    phoneNumber,
    userId: loggedInUser.id,
    teamId,
    inboundAgentId,
    outboundAgentId,
  });
};
