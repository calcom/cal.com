import { createHash } from "crypto";

import { totpRawCheck } from "@calcom/lib/totp";
import type { ZVerifyCodeInputSchema } from "@calcom/prisma/zod-utils";

import { TRPCError } from "@trpc/server";

type VerifyTokenOptions = {
  input: ZVerifyCodeInputSchema;
};

export type VerifyCodeUnAuthenticatedInput = ZVerifyCodeInputSchema;

export const verifyCodeUnAuthenticated = async (input: VerifyCodeUnAuthenticatedInput) => {
  const { email, code } = input;

  if (!email || !code) throw new Error("BAD_REQUEST");

  const secret = createHash("md5")
    .update(email + process.env.CALENDSO_ENCRYPTION_KEY)
    .digest("hex");

  const isValidToken = totpRawCheck(code, secret, { step: 900 });

  if (!isValidToken) throw new Error("invalid_code");

  return { verified: isValidToken };
};

export const verifyCodeUnAuthenticatedHandler = async ({ input }: VerifyTokenOptions) => {
  try {
    const result = await verifyCodeUnAuthenticated(input);
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
