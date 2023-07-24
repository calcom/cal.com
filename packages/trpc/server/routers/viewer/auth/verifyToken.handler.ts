import { createHash } from "crypto";
import { totp } from "otplib";

import { TRPCError } from "@trpc/server";

import type { TVerifyTokenSchema } from "./verifyToken.schema";

type VerifyTokenOptions = {
  input: TVerifyTokenSchema;
};

export const verifyTokenHandler = async ({ input }: VerifyTokenOptions) => {
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
