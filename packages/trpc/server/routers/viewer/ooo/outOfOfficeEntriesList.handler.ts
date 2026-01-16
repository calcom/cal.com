import { checkAdminOrOwner } from "@calcom/features/auth/lib/checkAdminOrOwner";
import { getTranslation } from "@calcom/lib/server/i18n";
import prisma from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import { TRPCError } from "@trpc/server";

import { type TOutOfOfficeEntriesListSchema } from "./outOfOfficeEntriesList.schema";

type GetOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TOutOfOfficeEntriesListSchema;
};

export const outOfOfficeEntriesList = async ({ ctx, input }: GetOptions) => {
  const t = await getTranslation(ctx.user.locale, "common");
  const {
    cursor,
    limit,
    fetchTeamMembersEntries,
    searchTerm,
    endDateFilterStartRange,
    endDateFilterEndRange,
  } = input;
  let fetchOOOEntriesForIds = [ctx.user.id];
  let reportingUserIds = [0];

  if (fetchTeamMembersEntries) {
    // Get teams of context user
    const teams = await prisma.membership.findMany({
      where: {
        userId: ctx.user.id,
        accepted: true,
      },
      select: {
        teamId: true,
        role: true,
      },
    });
    if (teams.length === 0) {
      throw new TRPCError({ code: "NOT_FOUND", message: t("user_has_no_team_yet") });
    }
    const ownerOrAdminTeamIds = teams
      .filter((team) => checkAdminOrOwner(team.role))
      .map((team) => team.teamId);

    // Fetch team member userIds
    const teamMembers = await prisma.team.findMany({
      where: {
        id: {
          in: teams.map((team) => team.teamId),
        },
      },
      select: {
        id: true,
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
      throw new TRPCError({ code: "NOT_FOUND", message: t("no_team_members") });
    }
    fetchOOOEntriesForIds = userIds;

    const adminTeams = teamMembers.filter(({ id }) => ownerOrAdminTeamIds.includes(id));

    reportingUserIds = adminTeams.flatMap(({ members }) =>
      members.filter(({ accepted, userId }) => accepted && userId !== ctx.user.id).map(({ userId }) => userId)
    );
  }

  const whereClause = {
    userId: {
      in: fetchOOOEntriesForIds,
    },
    end: {
      gte: endDateFilterStartRange ?? new Date().toISOString(),
      lte: endDateFilterEndRange,
    },
    ...(searchTerm
      ? {
          OR: [
            { notes: { contains: searchTerm } },
            { reason: { reason: { contains: searchTerm } } },
            {
              toUser: {
                OR: [{ email: { contains: searchTerm } }, { name: { contains: searchTerm } }],
              },
            },
            ...(fetchTeamMembersEntries
              ? [
                  {
                    user: {
                      OR: [{ email: { contains: searchTerm } }, { name: { contains: searchTerm } }],
                    },
                  },
                ]
              : []),
          ],
        }
      : {}),
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
          email: true,
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
      showNotePublicly: true,
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
    rows:
      outOfOfficeEntries.map((ooo) => {
        return {
          ...ooo,
          canEditAndDelete: fetchTeamMembersEntries ? reportingUserIds.includes(ooo.user.id) : true,
        };
      }) || [],
    nextCursor,
    meta: {
      totalRowCount: getTotalEntries || 0,
    },
  };
};
