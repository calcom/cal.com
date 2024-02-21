import { sendEmailVerification } from "@calcom/features/auth/lib/verifyEmail";
import logger from "@calcom/lib/logger";
import { prisma } from "@calcom/prisma";
import { TRPCError } from "@calcom/trpc/server";

import type { TrpcSessionUser } from "../../../trpc";
import type { TResendVerifyEmailSchema } from "./resendVerifyEmail.schema";

type ResendEmailOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TResendVerifyEmailSchema;
};

const log = logger.getSubLogger({ prefix: [`[[Auth] `] });

export const resendVerifyEmail = async ({ input, ctx }: ResendEmailOptions) => {
  let emailToVerify = ctx.user.email;
  let emailVerified = Boolean(ctx.user.emailVerified);
  let secondaryEmail;
  // If the input which is coming is not the current user's email, it could be a secondary email
  if (input?.email && input?.email !== ctx.user.email) {
    secondaryEmail = await prisma.secondaryEmail.findUnique({
      where: {
        email: input.email,
        userId: ctx.user.id,
      },
    });

    if (!secondaryEmail) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Email not found" });
    }

    if (secondaryEmail.emailVerified) {
      emailVerified = true;
    } else {
      emailToVerify = input.email;
      emailVerified = false;
    }
  }
  if (emailVerified) {
    log.info(`User ${ctx.user.id} already verified email`);
    return {
      ok: true,
      skipped: true,
    };
  }

  const email = await sendEmailVerification({
    email: emailToVerify,
    username: ctx.user?.username ?? undefined,
    language: ctx.user.locale,
    secondaryEmailId: secondaryEmail?.id,
  });

  return email;
};
