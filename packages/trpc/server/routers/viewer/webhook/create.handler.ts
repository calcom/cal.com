import { v4 } from "uuid";

import { prisma } from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import type { TCreateInputSchema } from "./create.schema";

type CreateOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TCreateInputSchema;
};

export const createHandler = async ({ ctx, input }: CreateOptions) => {
  const isAdmin = await prisma.user.findFirst({
    select: {
      id: true,
    },
    where: { id: ctx.user.id, role: "ADMIN" },
  });
  if (!isAdmin) {
    throw new Error("Unauthorized");
  }
  if (input.eventTypeId || input.teamId) {
    return await prisma.webhook.create({
      data: {
        id: v4(),
        ...input,
      },
    });
  }

  return await prisma.webhook.create({
    data: {
      id: v4(),
      userId: ctx.user.id,
      ...input,
    },
  });
};
