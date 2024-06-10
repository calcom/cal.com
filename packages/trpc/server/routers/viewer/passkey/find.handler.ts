import prisma from "@calcom/prisma";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../trpc";

type findOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
};
export const findHandler = async ({ ctx }: findOptions) => {
  try {
    const data = await prisma.passkey.findMany({
      where: {
        userId: ctx.user.id,
      },
      select: {
        id: true,
        userId: true,
        name: true,
        createdAt: true,
        updatedAt: true,
        lastUsedAt: true,
        counter: true,
        credentialDeviceType: true,
        credentialBackedUp: true,
        transports: true,
      },
    });

    return { data };
  } catch (err) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Unable to find passkeys. Please try again later.",
    });
  }
};
