import { v4 } from "uuid";

import { prisma } from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import { TRPCError } from "@trpc/server";

import type { TCreateInputSchema } from "./create.schema";

type CreateOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TCreateInputSchema;
};

export const createHandler = async ({ ctx, input }: CreateOptions) => {
  if (input.platform) {
    const { user } = ctx;
    if (user?.role !== "ADMIN") {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }
    return await prisma.webhook.create({
      data: {
        id: v4(),
        ...input,
      },
    });
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
