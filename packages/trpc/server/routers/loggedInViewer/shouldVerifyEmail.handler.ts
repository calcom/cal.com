import dayjs from "@calcom/dayjs";
import { EMAIL_VERIFY_ACCOUNTS_AFTER } from "@calcom/lib/constants";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

type ShouldVerifyEmailType = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
};

export const shouldVerifyEmailHandler = async ({ ctx }: ShouldVerifyEmailType) => {
  const { user } = ctx;
  // Destructuring here only makes it more illegible
  // pick only the part we want to expose in the API

  const isVerified = !!user.emailVerified;
  const isNewAccount = dayjs(EMAIL_VERIFY_ACCOUNTS_AFTER).isBefore(dayjs(user.createdDate));
  const isCalProvider = user.identityProvider === "CAL"; // We dont need to verify on OAUTH providers

  const obj = {
    id: user.id,
    email: user.email,
    requiresRedirect: isCalProvider && !isVerified && isNewAccount,
  };

  return obj;
};
