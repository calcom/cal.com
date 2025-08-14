import { createHash } from "crypto";

import { checkRateLimitAndThrowError } from "@calcom/lib/checkRateLimitAndThrowError";
import { IS_PRODUCTION } from "@calcom/lib/constants";
import logger from "@calcom/lib/logger";
import { hashEmail } from "@calcom/lib/server/PiiHasher";
import { totpRawCheck } from "@calcom/lib/totp";
import type { ZVerifyCodeInputSchema } from "@calcom/prisma/zod-utils";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import { TRPCError } from "@trpc/server";

type VerifyCodeOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: ZVerifyCodeInputSchema;
};

export type VerifyCodeAuthenticatedInput = ZVerifyCodeInputSchema & {
  userId: number;
  userRole?: string;
};

export const verifyCodeAuthenticated = async (input: VerifyCodeAuthenticatedInput) => {
  const { email, code, userId, userRole } = input;

  if (!userId || !email || !code) throw new Error("BAD_REQUEST");

  if (!IS_PRODUCTION || process.env.NEXT_PUBLIC_IS_E2E) {
    logger.warn(`Skipping code verification in dev/E2E environment`);
    return { verified: true };
  }

  if (userRole === "ADMIN") {
    logger.warn(`Skipping code verification for instance admin`);
    return { verified: true };
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

  return { verified: isValidToken };
};

export const verifyCodeHandler = async ({ ctx, input }: VerifyCodeOptions) => {
  const { user } = ctx;

  try {
    const result = await verifyCodeAuthenticated({
      ...input,
      userId: user.id,
      userRole: user.role,
    });
    return result.verified;
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "BAD_REQUEST") {
        throw new TRPCError({ code: "BAD_REQUEST" });
      }
      if (error.message === "invalid_code") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "invalid_code" });
      }
    }
    throw new TRPCError({ code: "BAD_REQUEST" });
  }
};

export default verifyCodeHandler;
