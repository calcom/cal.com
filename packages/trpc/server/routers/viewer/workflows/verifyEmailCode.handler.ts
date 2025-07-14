import { createHash } from "crypto";

import { totpRawCheck } from "@calcom/lib/totp";
import { prisma } from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import { TRPCError } from "@trpc/server";

import type { TVerifyEmailCodeInputSchema } from "./verifyEmailCode.schema";

type VerifyEmailCodeOptions = {
  ctx: {
    user: Pick<NonNullable<TrpcSessionUser>, "id">;
  };
  input: TVerifyEmailCodeInputSchema;
};

export const verifyEmailCodeHandler = async ({ ctx, input }: VerifyEmailCodeOptions) => {
  const { code, email, teamId } = input;
  const { id } = ctx.user;

  if (!code || !email) throw new TRPCError({ code: "BAD_REQUEST" });

  const secret = createHash("md5")
    .update(email + process.env.CALENDSO_ENCRYPTION_KEY)
    .digest("hex");

  const isValidToken = totpRawCheck(code, secret, { step: 900 });

  if (!isValidToken) throw new TRPCError({ code: "BAD_REQUEST", message: "invalid_code" });

  await prisma.verifiedEmail.create({
    data: {
      email,
      userId: id,
      teamId,
    },
  });

  return isValidToken;
};
