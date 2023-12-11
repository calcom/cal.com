import { sendEmailVerification } from "@calcom/features/auth/lib/verifyEmail";
import logger from "@calcom/lib/logger";

import type { TrpcSessionUser } from "../../../trpc";

type ResendEmailOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
};

const log = logger.getSubLogger({ prefix: [`[[Auth] `] });

export const resendVerifyEmail = async ({ ctx }: ResendEmailOptions) => {
  if (ctx.user.emailVerified) {
    log.info(`User ${ctx.user.id} already verified email`);
    return {
      ok: true,
      skipped: true,
    };
  }

  const email = await sendEmailVerification({
    email: ctx.user.email,
    username: ctx.user?.username ?? undefined,
    language: ctx.user.locale,
  });

  return email;
};
