import { createDefaultAIPhoneServiceProvider } from "@calcom/features/calAIPhone";
import type { TrpcSessionUser } from "../../../types";

type ListVoicesHandlerOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
};

export const listVoicesHandler = async ({ ctx }: ListVoicesHandlerOptions) => {
  const aiService = createDefaultAIPhoneServiceProvider();

  return await aiService.listVoices();
};
