import { prisma } from "@calcom/prisma";

import type { TrpcSessionUser } from "../../../types";

type ListWithTeamOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
};

export const listWithTeamHandler = async ({ ctx }: ListWithTeamOptions) => {
  const userTeamIds = await prisma.membership.findMany({
    where: {
      userId: ctx.user.id,
      accepted: true,
    },
    select: {
      teamId: true,
    },
  });

  return await prisma.eventType.findMany({
    where: {
      OR: [{ userId: ctx.user.id }, { teamId: { in: userTeamIds.map((membership) => membership.teamId) } }],
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
