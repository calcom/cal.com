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
