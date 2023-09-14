import { createHash } from "crypto";

import { checkRateLimitAndThrowError } from "@calcom/lib/checkRateLimitAndThrowError";
import { IS_PRODUCTION } from "@calcom/lib/constants";
import { totpRawCheck } from "@calcom/lib/totp";
import type { ZVerifyCodeInputSchema } from "@calcom/prisma/zod-utils";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import { TRPCError } from "@trpc/server";

type VerifyCodeOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: ZVerifyCodeInputSchema;
};

export const verifyCodeHandler = async ({ ctx, input }: VerifyCodeOptions) => {
  const { email, code } = input;
  const { user } = ctx;

  if (!user || !email || !code) throw new TRPCError({ code: "BAD_REQUEST" });

  if (!IS_PRODUCTION) return true;
  await checkRateLimitAndThrowError({
    rateLimitingType: "core",
    identifier: email,
  });

  const secret = createHash("md5")
    .update(email + process.env.CALENDSO_ENCRYPTION_KEY)
    .digest("hex");

  const isValidToken = totpRawCheck(code, secret, { step: 900 });

  if (!isValidToken) throw new TRPCError({ code: "BAD_REQUEST", message: "invalid_code" });

  return isValidToken;
};

export default verifyCodeHandler;
