import { prisma } from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import { TRPCError } from "@trpc/server";

import type { TCalIdEventTypeOrderInputSchema } from "./eventTypeOrder.schema";

type CalIdEventTypeOrderOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TCalIdEventTypeOrderInputSchema;
};

export const calidEventTypeOrderHandler = async ({ ctx, input }: CalIdEventTypeOrderOptions) => {
  const { user } = ctx;

  const allEventTypes = await prisma.eventType.findMany({
    select: {
      id: true,
    },
    where: {
      id: {
        in: input.ids,
      },
      OR: [
        {
          userId: user.id,
        },
        {
          users: {
            some: {
              id: user.id,
            },
          },
        },
        {
          calIdTeam: {
            members: {
              some: {
                userId: user.id,
                acceptedInvitation: true,
              },
            },
          },
        },
      ],
    },
  });
  const allEventTypeIds = new Set(allEventTypes.map((type) => type.id));
  if (input.ids.some((id) => !allEventTypeIds.has(id))) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
    });
  }
  await Promise.all(
    input.ids.reverse().map((id, position) => {
      return prisma.eventType.update({
        where: {
          id,
        },
        data: {
          position,
        },
      });
    })
  );
};
