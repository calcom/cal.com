import { randomBytes } from "crypto";

import { sendEmailVerificationLink } from "@calcom/emails/email-manager";
import { WEBAPP_URL } from "@calcom/lib/constants";
import rateLimit from "@calcom/lib/rateLimit";
import { getTranslation } from "@calcom/lib/server/i18n";
import { prisma } from "@calcom/prisma";
import { TokenType } from "@calcom/prisma/enums";

const limiter = rateLimit({
  intervalInMs: 60 * 1000, // 1 minute
});

interface VerifyEmailType {
  username?: string;
  email: string;
  language?: string;
}

export const sendEmailVerification = async ({ email, language, username }: VerifyEmailType) => {
  const token: string = randomBytes(32).toString("hex");
  const translation = await getTranslation(language ?? "en", "common");

  const sendEmailVerificationEnabled = await prisma.feature.findFirst({
    where: {
      slug: "email-verification",
      enabled: true,
    },
  });

  if (!sendEmailVerificationEnabled) {
    console.log("Email verification is disabled - Skipping");
    return { ok: true, skipped: true };
  }

  await prisma.verificationToken.create({
    data: {
      identifier: email,
      token,
      type: TokenType.VERIFY_ACCOUNT,
      expires: new Date(new Date().setHours(24)), // +1 day
    },
  });

  const params = new URLSearchParams({
    token,
  });

  const { isRateLimited } = limiter.check(10, email); // 10 requests per minute

  if (isRateLimited) {
    throw new Error("Too many requests");
  }

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
