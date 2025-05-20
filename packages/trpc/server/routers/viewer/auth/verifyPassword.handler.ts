import { verifyPassword } from "@calcom/features/auth/lib/verifyPassword";

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
  const userPassword = await ctx.ctx.prisma.userPassword.findUnique({
    where: {
      userId: ctx.user.id,
    },
  });

  if (!userPassword?.hash) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
  }

  const passwordsMatch = await verifyPassword(input.passwordInput, userPassword.hash);

  if (!passwordsMatch) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  return;
};
