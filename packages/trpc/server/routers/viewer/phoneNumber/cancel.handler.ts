import { createDefaultAIPhoneServiceProvider } from "@calcom/features/calAIPhone";
import type { TrpcSessionUser } from "../../../types";
import type { TCancelInputSchema } from "./cancel.schema";

type CancelHandlerOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TCancelInputSchema;
};

export const cancelHandler = async ({ ctx, input }: CancelHandlerOptions) => {
  const { phoneNumberId, teamId } = input;
  const aiService = createDefaultAIPhoneServiceProvider();

  return await aiService.cancelPhoneNumberSubscription({
    phoneNumberId,
    userId: ctx.user.id,
    teamId,
  });
};
