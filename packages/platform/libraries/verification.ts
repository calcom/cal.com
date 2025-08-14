import { createHash } from "crypto";
import type { NextApiRequest } from "next";

import { sendEmailVerificationByCode } from "@calcom/features/auth/lib/verifyEmail";
import { checkRateLimitAndThrowError } from "@calcom/lib/checkRateLimitAndThrowError";
import { IS_PRODUCTION } from "@calcom/lib/constants";
import getIP from "@calcom/lib/getIP";
import logger from "@calcom/lib/logger";
import { hashEmail, piiHasher } from "@calcom/lib/server/PiiHasher";
import { totpRawCheck } from "@calcom/lib/totp";

export interface VerifyCodeUnAuthenticatedInput {
  email: string;
  code: string;
}

export interface VerifyCodeAuthenticatedInput {
  email: string;
  code: string;
  userId: number;
  userRole?: string;
}

export interface SendVerifyEmailCodeInput {
  email: string;
  username?: string;
  language?: string;
  isVerifyingEmail?: boolean;
}

export interface SendVerifyEmailCodeContext {
  req?: NextApiRequest;
}

export const verifyCodeUnAuthenticated = async ({ email, code }: VerifyCodeUnAuthenticatedInput) => {
  if (!email || !code) throw new Error("BAD_REQUEST");

  const secret = createHash("md5")
    .update(email + process.env.CALENDSO_ENCRYPTION_KEY)
    .digest("hex");

  const isValidToken = totpRawCheck(code, secret, { step: 900 });

  if (!isValidToken) throw new Error("invalid_code");

  return isValidToken;
};

export const verifyCodeAuthenticated = async ({
  email,
  code,
  userId,
  userRole,
}: VerifyCodeAuthenticatedInput) => {
  if (!userId || !email || !code) throw new Error("BAD_REQUEST");

  if (!IS_PRODUCTION || process.env.NEXT_PUBLIC_IS_E2E) {
    logger.warn(`Skipping code verification in dev/E2E environment`);
    return true;
  }

  if (userRole === "ADMIN") {
    logger.warn(`Skipping code verification for instance admin`);
    return true;
  }

  await checkRateLimitAndThrowError({
    rateLimitingType: "core",
    identifier: hashEmail(email),
  });

  const secret = createHash("md5")
    .update(email + process.env.CALENDSO_ENCRYPTION_KEY)
    .digest("hex");

  const isValidToken = totpRawCheck(code, secret, { step: 900 });

  if (!isValidToken) throw new Error("invalid_code");

  return isValidToken;
};

export const sendVerifyEmailCode = async (
  input: SendVerifyEmailCodeInput,
  context?: SendVerifyEmailCodeContext
) => {
  const identifier = context?.req ? piiHasher.hash(getIP(context.req)) : hashEmail(input.email);

  await checkRateLimitAndThrowError({
    rateLimitingType: "core",
    identifier: `emailVerifyByCode.${identifier}`,
  });

  const email = await sendEmailVerificationByCode({
    email: input.email,
    username: input.username,
    language: input.language,
    isVerifyingEmail: input.isVerifyingEmail,
  });

  return email;
};
