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

  const whereConditional: Prisma.EventTypeWhereInput = {
    userId,
  };

  if (teamIds && teamIds.length === 1) {
    whereConditional.userId = null;
    teamConditional = { teamId: teamIds[0] };
  } else if (teamIds && teamIds.length > 1) {
    teamConditional = { teamId: { in: teamIds } };
  }

  // const skip = (page - 1) * pageSize;

  const result = await prisma.eventType.findMany({
    where: {
      ...whereConditional,
      ...teamConditional,
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
      parentId: true,
      users: {
        select: {
          id: true,
          username: true,
          name: true,
        },
      },
      hosts: {
        select: {
          user: {
            select: {
              id: true,
              username: true,
              name: true,
            },
          },
        },
      },
      children: {
        select: {
          id: true,
          users: {
            select: {
              id: true,
              username: true,
              name: true,
            },
          },
        },
      },
      team: {
        select: {
          id: true,
          slug: true,
          name: true,
        },
      },
    },
    // Temporarily disabled until we can figure out how to do this properly
    // skip,
    // take: pageSize,
  });

  return result;
};
