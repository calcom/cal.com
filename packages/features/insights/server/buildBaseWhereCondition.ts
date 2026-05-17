import type { readonlyPrisma } from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";

type BuildBaseWhereConditionCtxType = {
  userIsOwnerAdminOfParentTeam: boolean;
  userOrganizationId: number | null;
  insightsDb: typeof readonlyPrisma;
};

interface BuildBaseWhereConditionType {
  teamId?: number | null;
  eventTypeId?: number;
  memberUserId?: number;
  userId?: number;
  isAll?: boolean;
  ctx: BuildBaseWhereConditionCtxType;
}

export const buildBaseWhereCondition = async ({
  teamId,
  eventTypeId,
  memberUserId,
  userId,
  isAll,
  ctx,
}: BuildBaseWhereConditionType): Promise<{
  whereCondition: Prisma.BookingTimeStatusDenormalizedWhereInput;
}> => {
  const conditions: Prisma.BookingTimeStatusDenormalizedWhereInput[] = [];

  // EventType Filter
  if (eventTypeId) {
    conditions.push({
      OR: [{ eventTypeId }, { eventParentId: eventTypeId }],
    });
  }

  // User/Member filter
  if (memberUserId) {
    conditions.push({ userId: memberUserId });
  }

  if (userId) {
    conditions.push({
      teamId: null,
      userId: userId,
    });
  }

  // organization-wide queries condition
  if (isAll && ctx.userIsOwnerAdminOfParentTeam && ctx.userOrganizationId) {
    const teamsFromOrg = await ctx.insightsDb.team.findMany({
      where: {
        parentId: ctx.userOrganizationId,
      },
      select: {
        id: true,
      },
    });

    const teamIds = [ctx.userOrganizationId, ...teamsFromOrg.map((t) => t.id)];
    const usersFromOrg =
      teamsFromOrg.length > 0
        ? await ctx.insightsDb.membership.findMany({
            where: {
              team: {
                id: {
                  in: teamIds,
                },
              },
              accepted: true,
            },
            select: {
              userId: true,
            },
          })
        : [];

    conditions.push({
      OR: [
        {
          teamId: {
            in: teamIds,
          },
          isTeamBooking: true,
        },
        ...(usersFromOrg.length > 0
          ? [
              {
                userId: {
                  in: usersFromOrg.map((u) => u.userId),
                },
                isTeamBooking: false,
              },
            ]
          : []),
      ],
    });
  }

  // Team-specific queries condition
  if (!isAll && teamId) {
    const usersFromTeam = await ctx.insightsDb.membership.findMany({
      where: {
        teamId: teamId,
        accepted: true,
      },
      select: {
        userId: true,
      },
    });
    const userIdsFromTeam = usersFromTeam.map((u) => u.userId);

    conditions.push({
      OR: [
        {
          teamId,
          isTeamBooking: true,
        },
        {
          userId: {
            in: userIdsFromTeam,
          },
          isTeamBooking: false,
        },
      ],
    });
  }

  let whereCondition: Prisma.BookingTimeStatusDenormalizedWhereInput = {};

  if (conditions.length === 1) {
    whereCondition = conditions[0];
  } else if (conditions.length > 1) {
    whereCondition = { AND: conditions };
  }

  return {
    whereCondition:
      Object.keys(whereCondition).length === 0
        ? { id: -1 } // Ensure no data is returned for invalid parameters
        : whereCondition,
  };
};
