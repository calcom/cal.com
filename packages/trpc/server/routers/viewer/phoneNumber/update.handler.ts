import { createDefaultAIPhoneServiceProvider } from "@calcom/features/calAIPhone";
import type { TrpcSessionUser } from "../../../types";
import type { TUpdateInputSchema } from "./update.schema";

type UpdateHandlerOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TUpdateInputSchema;
};

export const updateHandler = async ({ ctx, input }: UpdateHandlerOptions) => {
  const { phoneNumber, inboundAgentId, outboundAgentId, teamId } = input;
  const aiService = createDefaultAIPhoneServiceProvider();

  return await aiService.updatePhoneNumberWithAgents({
    phoneNumber,
    userId: ctx.user.id,
    teamId,
    inboundAgentId,
    outboundAgentId,
  });
};
