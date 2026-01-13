import { createDefaultAIPhoneServiceProvider } from "@calcom/features/calAIPhone";

import type { TCancelInputSchema } from "./cancel.schema";

type CancelHandlerOptions = {
  ctx: {
    user: {
      id: number;
    };
  };
  input: TCancelInputSchema;
};

export const cancelHandler = async ({ ctx: { user: loggedInUser }, input }: CancelHandlerOptions) => {
  const { phoneNumberId, teamId } = input;
  const aiService = createDefaultAIPhoneServiceProvider();

  return await aiService.cancelPhoneNumberSubscription({
    phoneNumberId,
    userId: loggedInUser.id,
    teamId,
  });
};
