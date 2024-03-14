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
    throw new TRPCError({ code: "FORBIDDEN", message: "THIRD_PARTY_IDENTITY_PROVIDER_ENABLED" });
  }

  if (!validPassword(newPassword) || !validPassword(confirmPassword)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "password_hint_min" });
  }

  if (newPassword !== confirmPassword) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "new_password_matches_old_password" });
  }

  const hashedPassword = await hashPassword(newPassword);
  await prisma.userPassword.upsert({
    where: {
      userId: user.id,
    },
    create: {
      hash: hashedPassword,
      userId: user.id,
    },
    update: {
      hash: hashedPassword,
    },
  });
};
