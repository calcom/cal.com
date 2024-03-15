import { hashPassword } from "@calcom/features/auth/lib/hashPassword";
import { validPassword } from "@calcom/features/auth/lib/validPassword";
import prisma from "@calcom/prisma";
import { IdentityProvider } from "@calcom/prisma/enums";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../trpc";
import type { TCreateAccountPasswordInputSchema } from "./createAccountPassword.schema";

type CreateAccountPasswordOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TCreateAccountPasswordInputSchema;
};

export const createAccountPasswordHandler = async ({ input, ctx }: CreateAccountPasswordOptions) => {
  const { newPassword, confirmPassword } = input;

  const { user } = ctx;

  if (user.identityProvider === IdentityProvider.CAL) {
    throw new TRPCError({ code: "FORBIDDEN", message: "cannot_create_account_password_cal_provider" });
  }

  if (newPassword !== confirmPassword) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "new_password_not_matching_confirm_password" });
  }

  if (!validPassword(newPassword) || !validPassword(confirmPassword)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "password_hint_min" });
  }

  const userWithPassword = await prisma.user.findUnique({
    where: {
      id: user.id,
    },
    select: {
      password: true,
    },
  });
  if (user.identityProvider !== IdentityProvider.CAL && userWithPassword.password?.hash) {
    throw new TRPCError({ code: "FORBIDDEN", message: "cannot_create_account_password_already_existing" });
  }

  const hashedPassword = await hashPassword(newPassword);
  await prisma.userPassword.create({
    data: {
      hash: hashedPassword,
      userId: user.id,
    },
  });
};
