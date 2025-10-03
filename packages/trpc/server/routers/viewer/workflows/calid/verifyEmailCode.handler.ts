import { createHash } from "crypto";

import { totpRawCheck } from "@calcom/lib/totp";
import { prisma } from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import { TRPCError } from "@trpc/server";

import type { TCalIdVerifyEmailCodeInputSchema } from "./verifyEmailCode.schema";

type CalIdVerifyEmailCodeOptions = {
  ctx: {
    user: Pick<NonNullable<TrpcSessionUser>, "id">;
  };
  input: TCalIdVerifyEmailCodeInputSchema;
};

export const calIdVerifyEmailCodeHandler = async ({ ctx, input }: CalIdVerifyEmailCodeOptions) => {
  const { code, email, calIdTeamId } = input;
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
      calIdTeamId,
    },
  });

  return isValidToken;
};
