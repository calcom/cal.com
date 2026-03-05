import { getCreditsRepository } from "@calcom/features/di/containers/CreditsRepository";
import { sendVerificationCode } from "@calcom/features/ee/workflows/lib/reminders/verifyPhoneNumber";
import { checkRateLimitAndThrowError } from "@calcom/lib/checkRateLimitAndThrowError";
import hasKeyInMetadata from "@calcom/lib/hasKeyInMetadata";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";
import { TRPCError } from "@trpc/server";
import { hasTeamPlanHandler } from "../teams/hasTeamPlan.handler";
import type { TSendVerificationCodeInputSchema } from "./sendVerificationCode.schema";

type SendVerificationCodeOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TSendVerificationCodeInputSchema;
};

export const sendVerificationCodeHandler = async ({ ctx, input }: SendVerificationCodeOptions) => {
  const { user } = ctx;

  await checkRateLimitAndThrowError({
    identifier: `sms:verification:${user.id}`,
    rateLimitingType: "sms",
  });

  await checkRateLimitAndThrowError({
    identifier: `sms:verification:${user.id}`,
    rateLimitingType: "smsMonth",
  });

  const isCurrentUsernamePremium =
    user && hasKeyInMetadata(user, "isPremium") ? !!user.metadata.isPremium : false;

  const creditsRepository = getCreditsRepository();
  const creditBalance = await creditsRepository.findCreditBalance({ userId: user.id });
  const hasNoAdditionalCredits = !!creditBalance && creditBalance.additionalCredits <= 0;

  let isTeamsPlan = false;
  if (!isCurrentUsernamePremium) {
    const { hasTeamPlan } = await hasTeamPlanHandler({ ctx });
    isTeamsPlan = !!hasTeamPlan;
  }

  if (!isCurrentUsernamePremium && !isTeamsPlan && hasNoAdditionalCredits) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  const { phoneNumber } = input;
  return sendVerificationCode(phoneNumber);
};
