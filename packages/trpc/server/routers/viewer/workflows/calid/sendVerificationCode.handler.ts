import { sendVerificationCode } from "@calid/features/modules/workflows/utils/phoneVerification";

import { getSMSAbuseRequestContext } from "@calcom/lib/smsAbuseRequestContext";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import type { TRPCContext } from "../../../../createContext";
import type { TCalIdSendVerificationCodeInputSchema } from "./sendVerificationCode.schema";

type CalIdSendVerificationCodeOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    req: TRPCContext["req"] | undefined;
  };
  input: TCalIdSendVerificationCodeInputSchema;
};

export const calIdSendVerificationCodeHandler = async ({ ctx, input }: CalIdSendVerificationCodeOptions) => {
  // const { user } = ctx;

  // const isCurrentUsernamePremium =
  //   user && hasKeyInMetadata(user, "isPremium") ? !!user.metadata.isPremium : false;

  // const creditBalance = await CreditsRepository.findCreditBalance({ userId: user.id });
  // const hasNoAdditionalCredits = !!creditBalance && creditBalance.additionalCredits <= 0;

  // let isTeamsPlan = false;
  // if (!isCurrentUsernamePremium) {
  //   const { hasTeamPlan } = await hasTeamPlanHandler({ ctx });
  //   isTeamsPlan = !!hasTeamPlan;
  // }

  // if (!isCurrentUsernamePremium && !isTeamsPlan && hasNoAdditionalCredits) {
  //   throw new TRPCError({ code: "UNAUTHORIZED" });
  // }

  const { phoneNumber } = input;
  return sendVerificationCode(phoneNumber, {
    userId: ctx.user.id,
    ...getSMSAbuseRequestContext(ctx.req),
  });
};
