import { verifyCalPassword } from "@calcom/features/auth/lib/verifyPassword";
import { prisma } from "@calcom/prisma";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../types";
import type { TVerifyPasswordInputSchema } from "./verifyPassword.schema";

type VerifyPasswordOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TVerifyPasswordInputSchema;
};

export const verifyPasswordHandler = async ({ input, ctx }: VerifyPasswordOptions) => {
  const userPassword = await prisma.userPassword.findUnique({
    where: {
      userId: ctx.user.id,
    },
  });

  if (!userPassword?.hash || !userPassword.salt) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
  }
  const passwordsMatch = verifyCalPassword({
    inputPassword: input.passwordInput,
    storedHashBase64: userPassword.hash,
    saltBase64: userPassword.salt,
    iterations: 27500,
  });

  if (!passwordsMatch) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  return;
};
