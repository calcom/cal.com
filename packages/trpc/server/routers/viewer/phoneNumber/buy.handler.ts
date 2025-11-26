import type { NextApiRequest } from "next";

import { createDefaultAIPhoneServiceProvider } from "@calcom/features/calAIPhone";
import { getTrackingFromCookies } from "@calcom/lib/tracking";

import { TRPCError } from "@trpc/server";
import type { TBuyInputSchema } from "./buy.schema";

type BuyHandlerOptions = {
  ctx: {
    user: { id: number };
    req?: NextApiRequest;
  };
  input: TBuyInputSchema;
};

export const buyHandler = async ({ ctx: { user: loggedInUser }, input }: BuyHandlerOptions) => {
  const aiService = createDefaultAIPhoneServiceProvider();
  const tracking = getTrackingFromCookies(ctx.req?.cookies);

  const checkoutSession = await aiService.generatePhoneNumberCheckoutSession({
    userId: loggedInUser.id,
    teamId: input?.teamId ?? undefined,
    agentId: input.agentId,
    workflowId: input.workflowId,
    tracking,
  });

  if (checkoutSession) {
    return {
      checkoutUrl: checkoutSession.url,
      message: checkoutSession.message,
      phoneNumber: null,
    };
  }

  throw new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: "Phone number billing is required but not configured.",
  });
};
