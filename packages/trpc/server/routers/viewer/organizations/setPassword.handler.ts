import { createHash } from "crypto";

import { hashPassword } from "@calcom/features/auth/lib/hashPassword";
import { verifyPassword } from "@calcom/features/auth/lib/verifyPassword";
import { prisma } from "@calcom/prisma";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../trpc";
import type { TSetPasswordSchema } from "./setPassword.schema";

type UpdateOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TSetPasswordSchema;
};

export const setPasswordHandler = async ({ ctx, input }: UpdateOptions) => {
  const { newPassword } = input;

  const user = await prisma.user.findFirst({
    where: {
      id: ctx.user.id,
    },
    select: {
      password: true,
      email: true,
    },
  });

  if (!user) throw new TRPCError({ code: "BAD_REQUEST", message: "User not found" });
  if (!user.password) throw new TRPCError({ code: "BAD_REQUEST", message: "Password not set by default" });

  const generatedPassword = createHash("md5")
    .update(`${user?.email ?? ""}${process.env.CALENDSO_ENCRYPTION_KEY}`)
    .digest("hex");
  const isCorrectPassword = await verifyPassword(generatedPassword, user?.password);

  if (!isCorrectPassword)
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "The password set by default doesn't match your existing one. Contact an app admin.",
    });

  const hashedPassword = await hashPassword(newPassword);

  // Get parent user and all linked users
  const parentUser = await prisma.user.findFirst({
    where: { email: user.email, linkedByUserId: null },
    select: { id: true, linkedUsers: { select: { id: true } } },
  });

  // If there is a parent user and it has linked users, set all passwords to the one provided
  if (parentUser) {
    await prisma.user.updateMany({
      where: { id: { in: [parentUser.id].concat(parentUser.linkedUsers.map((user) => user.id)) } },
      data: { password: hashedPassword },
    });
  }

  await prisma.user.update({
    where: {
      id: ctx.user.id,
    },
    data: {
      password: hashedPassword,
    },
  });

  return { update: true };
};

export default setPasswordHandler;
