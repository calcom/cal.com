import { prisma } from "@calcom/prisma";

import type { TrpcSessionUser } from "../../../trpc";

type ListWithTeamOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
};

export const listWithTeamHandler = async ({ ctx }: ListWithTeamOptions) => {
  return await prisma.eventType.findMany({
    where: {
      OR: [
        { userId: ctx.user.id },
        {
          team: {
            members: {
              some: {
                userId: ctx.user.id,
              },
            },
          },
        },
      ],
    },
    select: {
      id: true,
      team: {
        select: {
          id: true,
          name: true,
        },
      },
      title: true,
      slug: true,
    },
  });
};
