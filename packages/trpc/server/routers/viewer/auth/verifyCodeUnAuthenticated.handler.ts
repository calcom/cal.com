import { createHash } from "crypto";
import { totp } from "otplib";

import type { ZVerifyCodeInputSchema } from "@calcom/prisma/zod-utils";

import { TRPCError } from "@trpc/server";

type VerifyTokenOptions = {
  input: ZVerifyCodeInputSchema;
};

export const verifyCodeUnAuthenticatedHandler = async ({ input }: VerifyTokenOptions) => {
  const { email, code } = input;

  if (!email || !code) throw new TRPCError({ code: "BAD_REQUEST" });

  const secret = createHash("md5")
    .update(email + process.env.CALENDSO_ENCRYPTION_KEY)
    .digest("hex");

  totp.options = { step: 900 };
  const isValidToken = totp.check(code, secret);

  if (!isValidToken) throw new TRPCError({ code: "BAD_REQUEST", message: "invalid_code" });

  return isValidToken;
};
