import { IdentityProvider } from "@prisma/client";

import { hashPassword } from "@calcom/features/auth/lib/hashPassword";
import { validPassword } from "@calcom/features/auth/lib/validPassword";
import { verifyPassword } from "@calcom/features/auth/lib/verifyPassword";
import { prisma } from "@calcom/prisma";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../trpc";
import type { TChangePasswordInputSchema } from "./changePassword.schema";

type ChangePasswordOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TChangePasswordInputSchema;
};

export const changePasswordHandler = async ({ input, ctx }: ChangePasswordOptions) => {
  const { oldPassword, newPassword } = input;

  const { user } = ctx;

  if (user.identityProvider !== IdentityProvider.CAL) {
    throw new TRPCError({ code: "FORBIDDEN", message: "THIRD_PARTY_IDENTITY_PROVIDER_ENABLED" });
  }

  const currentPasswordQuery = await prisma.user.findFirst({
    where: {
      id: user.id,
    },
    select: {
      password: true,
    },
  });

  const currentPassword = currentPasswordQuery?.password;

  if (!currentPassword) {
    throw new TRPCError({ code: "NOT_FOUND", message: "MISSING_PASSWORD" });
  }

  const passwordsMatch = await verifyPassword(oldPassword, currentPassword);
  if (!passwordsMatch) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "incorrect_password" });
  }

  if (oldPassword === newPassword) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "new_password_matches_old_password" });
  }

  if (!validPassword(newPassword)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "password_hint_min" });
  }

  const hashedPassword = await hashPassword(newPassword);
  await prisma.user.update({
    where: {
      id: user.id,
    },
    data: {
      password: hashedPassword,
    },
  });
};
