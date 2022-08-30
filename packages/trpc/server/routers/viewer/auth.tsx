import { IdentityProvider } from "@prisma/client";
import { z } from "zod";

import { hashPassword, validPassword, verifyPassword } from "@calcom/lib/auth";
import prisma from "@calcom/prisma";

import { TRPCError } from "@trpc/server";

import { createProtectedRouter } from "../../createRouter";

export const authRouter = createProtectedRouter().mutation("changePassword", {
  input: z.object({
    oldPassword: z.string(),
    newPassword: z.string(),
  }),
  async resolve({ input, ctx }) {
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
      throw new TRPCError({ code: "BAD_REQUEST", message: "INCORRECT_PASSWORD" });
    }

    if (oldPassword === newPassword) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "PASSWORD_MATCHES_OLD" });
    }

    if (!validPassword(newPassword)) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "INVALID_PASSWORD" });
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
  },
});
