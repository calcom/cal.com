import { sendEmailVerification } from "@calcom/features/auth/lib/verifyEmail";

import type { TrpcSessionUser } from "../../../trpc";

type ResendEmailOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
};

export const resendVerifyEmail = async ({ ctx }: ResendEmailOptions) => {
  const email = await sendEmailVerification({
    email: ctx.user.email,
    username: ctx.user?.username ?? undefined,
    language: ctx.user.locale,
  });

  return email;
};
