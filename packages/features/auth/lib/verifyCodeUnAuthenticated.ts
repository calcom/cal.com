import { createHash } from "node:crypto";
import process from "node:process";
import { checkRateLimitAndThrowError } from "@calcom/lib/checkRateLimitAndThrowError";
import { ErrorCode } from "@calcom/lib/errorCodes";
import { ErrorWithCode } from "@calcom/lib/errors";
import { hashEmail } from "@calcom/lib/server/PiiHasher";
import { totpRawCheck } from "@calcom/lib/totp";

export const verifyCodeUnAuthenticated = async (email: string, code: string) => {
  if (!email || !code) {
    throw new Error("Email and code are required");
  }

  await checkRateLimitAndThrowError({
    rateLimitingType: "core",
    identifier: `emailVerifyCode.${hashEmail(email)}`,
  });

  const secret = createHash("md5")
    .update(email + (process.env.CALENDSO_ENCRYPTION_KEY || ""))
    .digest("hex");

  const isValidToken = totpRawCheck(code, secret, { step: 900 });

  if (!isValidToken) {
    throw new ErrorWithCode(ErrorCode.InvalidVerificationCode, "invalid_verification_code");
  }

  return true;
};
