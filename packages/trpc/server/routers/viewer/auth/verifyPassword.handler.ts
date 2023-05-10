import { verifyPassword } from "@calcom/features/auth/lib/verifyPassword";
import { prisma } from "@calcom/prisma";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../trpc";
import type { TVerifyPasswordInputSchema } from "./verifyPassword.schema";

type VerifyPasswordOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TVerifyPasswordInputSchema;
};

export const verifyPasswordHandler = async ({ input, ctx }: VerifyPasswordOptions) => {
  const user = await prisma.user.findUnique({
    where: {
      id: ctx.user.id,
    },
  });

  if (!user?.password) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
  }

  const passwordsMatch = await verifyPassword(input.passwordInput, user.password);

  if (!passwordsMatch) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  return;
};
