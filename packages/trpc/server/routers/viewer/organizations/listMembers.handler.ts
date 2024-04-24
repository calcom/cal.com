import { UserRepository } from "@calcom/lib/server/repository/user";
import { prisma } from "@calcom/prisma";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../trpc";
import type { TListMembersSchema } from "./listMembers.schema";

type GetOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TListMembersSchema;
};

export const listMembersHandler = async ({ ctx, input }: GetOptions) => {
  const organizationId = ctx.user.organizationId;
  const searchTerm = input.searchTerm;

  if (!organizationId) {
    throw new TRPCError({ code: "NOT_FOUND", message: "User is not part of any organization." });
  }

  if (ctx.user.organization.isPrivate && !ctx.user.organization.isOrgAdmin) {
    return {
      canUserGetMembers: false,
      rows: [],
      meta: {
        totalRowCount: 0,
      },
    };
  }

  const { cursor, limit } = input;

  const getTotalMembers = await prisma.membership.count({
    where: {
      teamId: organizationId,
    },
  });

  // I couldnt get this query to work direct on membership table
  const teamMembers = await prisma.membership.findMany({
    where: {
      teamId: organizationId,
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
          teams: {
            select: {
              team: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                },
              },
            },
          },
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

  const members = await Promise.all(
    teamMembers?.map(async (membership) => {
      const user = await UserRepository.enrichUserWithItsProfile({ user: membership.user });
      return {
        id: user.id,
        username: user.username,
        email: user.email,
        timeZone: user.timeZone,
        role: membership.role,
        accepted: membership.accepted,
        disableImpersonation: user.disableImpersonation,
        completedOnboarding: user.completedOnboarding,
        avatarUrl: user.avatarUrl,
        teams: user.teams
          .filter((team) => team.team.id !== organizationId) // In this context we dont want to return the org team
          .map((team) => {
            if (team.team.id === organizationId) return;
            return {
              id: team.team.id,
              name: team.team.name,
              slug: team.team.slug,
            };
          }),
      };
    }) || []
  );

  return {
    rows: members || [],
    nextCursor,
    meta: {
      totalRowCount: getTotalMembers || 0,
    },
  };
};

export default listMembersHandler;
