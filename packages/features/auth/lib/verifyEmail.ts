import { randomBytes, createHash } from "node:crypto";
import { totp } from "otplib";

import {
  sendEmailVerificationCode,
  sendEmailVerificationLink,
  sendChangeOfEmailVerificationLink,
} from "@calcom/emails/auth-email-service";
import { FeaturesRepository } from "@calcom/features/flags/features.repository";
import { sentrySpan } from "@calcom/features/watchlist/lib/telemetry";
import { checkIfEmailIsBlockedInWatchlistController } from "@calcom/features/watchlist/operations/check-if-email-in-watchlist.controller";
import { checkRateLimitAndThrowError } from "@calcom/lib/checkRateLimitAndThrowError";
import { WEBAPP_URL } from "@calcom/lib/constants";
import logger from "@calcom/lib/logger";
import { hashEmail } from "@calcom/lib/server/PiiHasher";
import { getTranslation } from "@calcom/lib/server/i18n";
import { prisma } from "@calcom/prisma";

const log = logger.getSubLogger({ prefix: [`[[Auth] `] });

interface VerifyEmailType {
  username?: string;
  email: string;
  language?: string;
  secondaryEmailId?: number;
  isVerifyingEmail?: boolean;
  isPlatform?: boolean;
}

export const sendEmailVerification = async ({
  email,
  language,
  username,
  secondaryEmailId,
  isPlatform = false,
}: VerifyEmailType) => {
  const token = randomBytes(32).toString("hex");
  const translation = await getTranslation(language ?? "en", "common");
  const featuresRepository = new FeaturesRepository(prisma);
  const emailVerification = await featuresRepository.checkIfFeatureIsEnabledGlobally("email-verification");

  if (!emailVerification) {
    log.warn("Email verification is disabled - Skipping");
    return { ok: true, skipped: true };
  }

  if (await checkIfEmailIsBlockedInWatchlistController({ email, organizationId: null, span: sentrySpan })) {
    log.warn("Email is blocked - not sending verification email", email);
    return { ok: false, skipped: false };
  }

  if (isPlatform) {
    log.warn("Skipping Email verification");
    return { ok: true, skipped: true };
  }

  await checkRateLimitAndThrowError({
    rateLimitingType: "core",
    identifier: `sendEmailVerification:${hashEmail(email)}`,
  });

  await prisma.verificationToken.create({
    data: {
      identifier: email,
      token,
      expires: new Date(Date.now() + 24 * 3600 * 1000), // +1 day
      secondaryEmailId: secondaryEmailId || null,
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
    isSecondaryEmailVerification: !!secondaryEmailId,
  });

  return { ok: true, skipped: false };
};

export const sendEmailVerificationByCode = async ({
  email,
  language,
  username,
  isVerifyingEmail,
}: VerifyEmailType) => {
  if (await checkIfEmailIsBlockedInWatchlistController({ email, organizationId: null, span: sentrySpan })) {
    log.warn("Email is blocked - not sending verification email", email);
    return { ok: false, skipped: false };
  }

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
    isVerifyingEmail,
  });

  return { ok: true, skipped: false };
};

interface ChangeOfEmail {
  user: {
    username: string;
    emailFrom: string;
    emailTo: string;
  };
  language?: string;
}

export const sendChangeOfEmailVerification = async ({ user, language }: ChangeOfEmail) => {
  const token = randomBytes(32).toString("hex");
  const translation = await getTranslation(language ?? "en", "common");
  const featuresRepository = new FeaturesRepository(prisma);
  const emailVerification = await featuresRepository.checkIfFeatureIsEnabledGlobally("email-verification");

  if (!emailVerification) {
    log.warn("Email verification is disabled - Skipping");
    return { ok: true, skipped: true };
  }

  if (
    await checkIfEmailIsBlockedInWatchlistController({
      email: user.emailFrom,
      organizationId: null,
      span: sentrySpan,
    })
  ) {
    log.warn("Email is blocked - not sending verification email", user.emailFrom);
    return { ok: false, skipped: false };
  }

  await checkRateLimitAndThrowError({
    rateLimitingType: "core",
    identifier: hashEmail(user.emailFrom),
  });

  await prisma.verificationToken.create({
    data: {
      identifier: user.emailFrom, // We use from as this is the email use to get the metadata from
      token,
      expires: new Date(Date.now() + 24 * 3600 * 1000), // +1 day
    },
  });

  const params = new URLSearchParams({
    token,
  });

  await sendChangeOfEmailVerificationLink({
    language: translation,
    verificationEmailLink: `${WEBAPP_URL}/auth/verify-email-change?${params.toString()}`,
    user: {
      emailFrom: user.emailFrom,
      emailTo: user.emailTo,
      name: user.username,
    },
  });

  return { ok: true, skipped: false };
};
