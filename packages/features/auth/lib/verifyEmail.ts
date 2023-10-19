import { randomBytes, createHash } from "crypto";
import { totp } from "otplib";

import { sendEmailVerificationCode, sendEmailVerificationLink } from "@calcom/emails/email-manager";
import { getFeatureFlagMap } from "@calcom/features/flags/server/utils";
import { checkRateLimitAndThrowError } from "@calcom/lib/checkRateLimitAndThrowError";
import { WEBAPP_URL } from "@calcom/lib/constants";
import logger from "@calcom/lib/logger";
import { getTranslation } from "@calcom/lib/server/i18n";
import { prisma } from "@calcom/prisma";

const log = logger.getSubLogger({ prefix: [`[[Auth] `] });

interface VerifyEmailType {
  username?: string;
  email: string;
  language?: string;
}

export const sendEmailVerification = async ({ email, language, username }: VerifyEmailType) => {
  const token = randomBytes(32).toString("hex");
  const translation = await getTranslation(language ?? "en", "common");
  const flags = await getFeatureFlagMap(prisma);

  if (!flags["email-verification"]) {
    log.warn("Email verification is disabled - Skipping");
    return { ok: true, skipped: true };
  }

  await checkRateLimitAndThrowError({
    rateLimitingType: "core",
    identifier: email,
  });

  await prisma.verificationToken.create({
    data: {
      identifier: email,
      token,
      expires: new Date(Date.now() + 24 * 3600 * 1000), // +1 day
    },
  });

  const params = new URLSearchParams({
    token,
  });

  await sendEmailVerificationLink({
    language: translation,
    verificationEmailLink: `${WEBAPP_URL}/api/auth/verify-email?${params.toString()}`,
    user: {
      email,
      name: username,
    },
  });

  return { ok: true, skipped: false };
};

export const sendEmailVerificationByCode = async ({ email, language, username }: VerifyEmailType) => {
  const translation = await getTranslation(language ?? "en", "common");
  const secret = createHash("md5")
    .update(email + process.env.CALENDSO_ENCRYPTION_KEY)
    .digest("hex");

  totp.options = { step: 900 };
  const code = totp.generate(secret);

  await sendEmailVerificationCode({
    language: translation,
    verificationEmailCode: code,
    user: {
      email,
      name: username,
    },
  });

  return { ok: true, skipped: false };
};
