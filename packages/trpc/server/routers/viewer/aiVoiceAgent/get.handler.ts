import { createDefaultAIPhoneServiceProvider } from "@calcom/features/calAIPhone";
import type { TrpcSessionUser } from "../../../types";
import type { TGetInputSchema } from "./get.schema";

type GetHandlerOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TGetInputSchema;
};

export const getHandler = async ({ ctx, input }: GetHandlerOptions) => {
  const aiService = createDefaultAIPhoneServiceProvider();

  return await aiService.getAgentWithDetails({
    id: input.id,
    userId: ctx.user.id,
    teamId: input.teamId,
  });
};
