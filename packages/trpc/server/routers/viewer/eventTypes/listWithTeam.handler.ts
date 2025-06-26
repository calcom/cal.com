import { checkRateLimitAndThrowError } from "@calcom/lib/checkRateLimitAndThrowError";
import { prisma } from "@calcom/prisma";

import type { TrpcSessionUser } from "../../../types";
import type { TListWithTeamInputSchema } from "./listWithTeam.schema";

type ListWithTeamOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input?: TListWithTeamInputSchema;
};

export const listWithTeamHandler = async ({ ctx, input }: ListWithTeamOptions) => {
  await checkRateLimitAndThrowError({
    identifier: `eventTypes:listWithTeam:${ctx.user.id}`,
    rateLimitingType: "common",
  });

  const take = input?.take ?? 50;
  const skip = input?.skip ?? 0;

  const memberships = await prisma.membership.findMany({
    where: {
      userId: ctx.user.id,
      accepted: true,
    },
    select: {
      teamId: true,
    },
  });
  const userTeamIds = memberships.map((m) => m.teamId);

  const [eventTypes, totalCount] = await Promise.all([
    prisma.eventType.findMany({
      where: {
        OR: [{ userId: ctx.user.id }, { teamId: { in: userTeamIds } }],
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
      take,
      skip,
      orderBy: [{ team: { name: "asc" } }, { title: "asc" }],
    }),
    prisma.eventType.count({
      where: {
        OR: [{ userId: ctx.user.id }, { teamId: { in: userTeamIds } }],
      },
    }),
  ]);

  return {
    eventTypes,
    totalCount,
    hasMore: skip + take < totalCount,
  };
};
