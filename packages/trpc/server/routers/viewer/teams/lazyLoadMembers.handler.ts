import type { PrismaClient } from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import type { TLazyLoadMembersInputSchema } from "./lazyLoadMembers.schema";

type LazyLoadMembersHandlerOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    prisma: PrismaClient;
  };
  input: TLazyLoadMembersInputSchema;
};

export const lazyLoadMembersHandler = async ({ ctx, input }: LazyLoadMembersHandlerOptions) => {
  const { prisma } = ctx;
  const { cursor, limit, teamId, searchTerm } = input;

  const getTotalMembers = await prisma.membership.count({
    where: {
      teamId,
    },
  });

  const teamMembers = await prisma.membership.findMany({
    where: {
      teamId,
      ...(searchTerm && {
        user: {
          OR: [
            {
              email: {
                contains: searchTerm,
              },
            },
            {
              username: {
                contains: searchTerm,
              },
            },
          ],
        },
      }),
    },
    select: {
      id: true,
      role: true,
      accepted: true,
      user: {
        select: {
          id: true,
          username: true,
          email: true,
          avatarUrl: true,
          timeZone: true,
          disableImpersonation: true,
          completedOnboarding: true,
          // teams: {
          //   select: {
          //     team: {
          //       select: {
          //         id: true,
          //         name: true,
          //         slug: true,
          //       },
          //     },
          //   },
          // },
        },
      },
    },
    cursor: cursor ? { id: cursor } : undefined,
    take: limit + 1, // We take +1 as itll be used for the next cursor
    orderBy: {
      id: "asc",
    },
  });

  let nextCursor: typeof cursor | undefined = undefined;
  if (teamMembers && teamMembers.length > limit) {
    const nextItem = teamMembers.pop();
    nextCursor = nextItem?.id;
  }

  return { members, nextCursor };
};

export default lazyLoadMembersHandler;
