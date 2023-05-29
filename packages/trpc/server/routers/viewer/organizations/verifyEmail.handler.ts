import { createHash } from "crypto";
import { totp } from "otplib";

import { sendOrganizationEmailVerification } from "@calcom/emails/email-manager";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import { TRPCError } from "@trpc/server";

import type { TVerifyEmailInputSchema } from "./verifyEmail.schema";

type VerifyEmailOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TVerifyEmailInputSchema;
};

export const verifyEmailHandler = async ({ ctx, input }: VerifyEmailOptions) => {
  const { email } = input;
  const { user } = ctx;

  if (!user || !email) throw new TRPCError({ code: "BAD_REQUEST" });

  const secret = createHash("md5")
    .update(email + process.env.CALENDSO_ENCRYPTION_KEY)
    .digest("hex");

  totp.options = { step: 90 };
  const code = totp.generate(secret);

  console.log({ email, code });

  await sendOrganizationEmailVerification(email, code);

  return { emailSent: true };
};
