import prisma from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import { TRPCError } from "@trpc/server";

import { type TOutOfOfficeEntriesListSchema } from "./outOfOfficeEntriesList.schema";

type GetOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TOutOfOfficeEntriesListSchema;
};

export const outOfOfficeEntriesList = async ({ ctx, input }: GetOptions) => {
  const {
    cursor,
    limit,
    fetchTeamMembersEntries,
    searchTerm,
    endDateFilterStartRange,
    endDateFilterEndRange,
  } = input;
  let fetchOOOEntriesForIds = [ctx.user.id];

  if (fetchTeamMembersEntries) {
    // Get teams where context user is admin or owner
    const teams = await prisma.membership.findMany({
      where: {
        userId: ctx.user.id,
        role: {
          in: [MembershipRole.ADMIN, MembershipRole.OWNER],
        },
        accepted: true,
      },
      select: {
        teamId: true,
        role: true,
      },
    });
    if (teams.length === 0) {
      throw new TRPCError({ code: "NOT_FOUND", message: "user_not_admin_nor_owner" });
    }

    // Fetch team member userIds
    const teamMembers = await prisma.team.findMany({
      where: {
        id: {
          in: teams.map((team) => team.teamId),
        },
      },
      select: {
        members: {
          select: {
            userId: true,
            accepted: true,
          },
        },
      },
    });
    const userIds = teamMembers
      .flatMap((team) => team.members.filter((member) => member.accepted).map((member) => member.userId))
      .filter((id) => id !== ctx.user.id);
    if (userIds.length === 0) {
      throw new TRPCError({ code: "NOT_FOUND", message: "no_team_members" });
    }
    fetchOOOEntriesForIds = userIds;
  }

  const whereClause = {
    userId: {
      in: fetchOOOEntriesForIds,
    },
    end: {
      gte: endDateFilterStartRange,
      lte: endDateFilterEndRange,
    },
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
  };

  const getTotalEntries = await prisma.outOfOfficeEntry.count({
    where: whereClause,
  });

  const outOfOfficeEntries = await prisma.outOfOfficeEntry.findMany({
    where: whereClause,
    select: {
      id: true,
      uuid: true,
      start: true,
      end: true,
      toUserId: true,
      toUser: {
        select: {
          username: true,
          name: true,
        },
      },
      reason: {
        select: {
          id: true,
          emoji: true,
          reason: true,
          userId: true,
        },
      },
      notes: true,
      user: fetchTeamMembersEntries
        ? {
            select: {
              id: true,
              username: true,
              email: true,
              avatarUrl: true,
              name: true,
            },
          }
        : false,
    },
    orderBy: {
      start: "asc",
    },
    cursor: cursor ? { id: cursor } : undefined,
    take: limit + 1,
  });

  let nextCursor: number | undefined = undefined;
  if (outOfOfficeEntries && outOfOfficeEntries.length > limit) {
    const nextItem = outOfOfficeEntries.pop();
    nextCursor = nextItem?.id;
  }

  return {
    rows: outOfOfficeEntries || [],
    nextCursor,
    meta: {
      totalRowCount: getTotalEntries || 0,
    },
  };
};
