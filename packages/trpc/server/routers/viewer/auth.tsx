import { IdentityProvider } from "@prisma/client";
import { z } from "zod";

import { hashPassword, validPassword, verifyPassword } from "@calcom/lib/auth";
import prisma from "@calcom/prisma";

import { TRPCError } from "@trpc/server";

import { router, authedProcedure } from "../../trpc";

export const authRouter = router({
  changePassword: authedProcedure
    .input(
      z.object({
        oldPassword: z.string(),
        newPassword: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
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
    }),
  verifyPassword: authedProcedure
    .input(
      z.object({
        passwordInput: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
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
    }),
});
