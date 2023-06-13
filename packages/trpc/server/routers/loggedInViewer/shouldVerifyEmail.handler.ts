import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

type ShouldVerifyEmailType = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
};

export const shouldVerifyEmailHandler = async ({ ctx }: ShouldVerifyEmailType) => {
  const { user } = ctx;
  const isVerified = !!user.emailVerified;
  const isCalProvider = user.identityProvider === "CAL"; // We dont need to verify on OAUTH providers as they are already verified by the provider

  const obj = {
    id: user.id,
    email: user.email,
    isVerified: isVerified || !isCalProvider,
  };

  return obj;
};
