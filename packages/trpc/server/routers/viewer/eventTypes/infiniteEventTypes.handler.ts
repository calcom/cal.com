import { checkRateLimitAndThrowError } from "@calcom/lib/checkRateLimitAndThrowError";
import { prisma } from "@calcom/prisma";

import type { TrpcSessionUser } from "../../../trpc";
import type { TInfiniteEventTypesInputSchema } from "./infiniteEventTypes.schema";
import type { Prisma } from ".prisma/client";

interface EventTypesPaginateProps {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TInfiniteEventTypesInputSchema;
}

export const paginateHandler = async ({ ctx, input }: EventTypesPaginateProps) => {
  await checkRateLimitAndThrowError({
    identifier: `eventTypes:paginate:${ctx.user.id}`,
    rateLimitingType: "common",
  });
  const userId = ctx.user.id;

  const { teamIds, pageSize = 20, page: pageFromInput = 1 } = input;
  let page = 1;
  if (pageFromInput < 1) {
    page = 1;
  }

  let teamConditional: Prisma.EventTypeWhereInput = {};
  if (teamIds && teamIds.length === 1) {
    teamConditional = { teamId: teamIds[0] };
  } else if (teamIds && teamIds.length > 1) {
    teamConditional = { teamId: { in: teamIds } };
  }

  const whereConditional: Prisma.EventTypeWhereInput = {
    userId,
    ...teamConditional,
  };

  const skip = (page - 1) * pageSize;

  // const selectWithTeam: Prisma.EventTypeSelect = {
  //   team: {
  //     select: {
  //       id: true,
  //       name: true,
  //     },
  //   },
  // };

  const result = await prisma.eventType.findMany({
    where: {
      ...whereConditional,
    },
    select: {
      id: true,
      title: true,
      description: true,
      length: true,
      schedulingType: true,
      slug: true,
      hidden: true,
      metadata: true,
      teamId: true,
      users: {
        select: {
          id: true,
          username: true,
          name: true,
        },
      },
      team: {
        select: {
          id: true,
          slug: true,
          members: {
            select: {
              userId: true,
              role: true,
            },
          },
        },
      },
    },
    skip,
    take: pageSize,
  });
  console.log("result", result);
  return result;
};
