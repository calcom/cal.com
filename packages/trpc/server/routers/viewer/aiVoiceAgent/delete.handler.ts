import { createDefaultAIPhoneServiceProvider } from "@calcom/features/calAIPhone";

import type { TrpcSessionUser } from "../../../types";
import type { TDeleteInputSchema } from "./delete.schema";

type DeleteHandlerOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TDeleteInputSchema;
};

export const deleteHandler = async ({ ctx, input }: DeleteHandlerOptions) => {
  const aiService = createDefaultAIPhoneServiceProvider();

  return await aiService.deleteAgent({
    id: input.id,
    userId: ctx.user.id,
    teamId: input.teamId,
  });
};
