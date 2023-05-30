import { createHash } from "crypto";
import { totp } from "otplib";

import { sendOrganizationEmailVerification } from "@calcom/emails/email-manager";
import { getTranslation } from "@calcom/lib/server/i18n";
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

  const language = await getTranslation(input.language ?? "en", "common");

  await sendOrganizationEmailVerification({
    user: {
      email,
    },
    code,
    language,
  });

  return { emailSent: true };
};
