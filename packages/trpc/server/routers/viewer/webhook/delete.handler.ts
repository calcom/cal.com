import { prisma } from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import type { TDeleteInputSchema } from "./delete.schema";

type DeleteOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TDeleteInputSchema;
};

export const deleteHandler = async ({ ctx, input }: DeleteOptions) => {
  const { id } = input;

  if (input.eventTypeId) {
    await prisma.eventType.update({
      where: {
        id: input.eventTypeId,
      },
      data: {
        webhooks: {
          delete: {
            id,
          },
        },
      },
    });
  } else if (input.teamId) {
    await prisma.team.update({
      where: {
        id: input.teamId,
      },
      data: {
        webhooks: {
          delete: {
            id,
          },
        },
      },
    });
  } else {
    await prisma.user.update({
      where: {
        id: ctx.user.id,
      },
      data: {
        webhooks: {
          delete: {
            id,
          },
        },
      },
    });
  }

  return {
    id,
  };
};
