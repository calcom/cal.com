import { createDefaultAIPhoneServiceProvider } from "@calcom/features/calAIPhone";
import type { TrpcSessionUser } from "../../../types";
import type { TListInputSchema } from "./list.schema";

type ListHandlerOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TListInputSchema;
};

export const listHandler = async ({ ctx, input }: ListHandlerOptions) => {
  const aiService = createDefaultAIPhoneServiceProvider();

  return await aiService.listAgents({
    userId: ctx.user.id,
    teamId: input?.teamId,
    scope: input?.scope ?? "all",
  });
};
