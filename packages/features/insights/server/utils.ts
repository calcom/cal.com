import type { PrismaClient } from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";

type BuildBaseWhereConditionCtxType = {
  userIsOwnerAdminOfParentTeam: boolean;
  userOrganizationId: number | null;
  insightsDb: PrismaClient;
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

export interface IResultTeamList {
  id: number;
  slug: string | null;
  name: string | null;
  logoUrl: string | null;
  userId?: number;
  isOrg?: boolean;
}

export async function getEventTypeList({
  prisma,
  teamId,
  userId,
  isAll,
  user,
}: {
  prisma: PrismaClient;
  teamId: number | null | undefined;
  userId: number | null | undefined;
  isAll: boolean | undefined;
  user: {
    id: number;
    organizationId: number | null;
    isOwnerAdminOfParentTeam: boolean;
  };
}) {
  if (!teamId && !userId && !isAll) {
    return [];
  }

  const membershipWhereConditional: Prisma.MembershipWhereInput = {};
  let childrenTeamIds: number[] = [];

  if (userId && !teamId && !isAll) {
    const eventTypeResult = await prisma.eventType.findMany({
      select: {
        id: true,
        slug: true,
        title: true,
        teamId: true,
        userId: true,
        team: {
          select: {
            name: true,
          },
        },
      },
      where: {
        userId: user.id,
        teamId: null,
      },
    });

    return eventTypeResult;
  }

  if (isAll && user.organizationId && user.isOwnerAdminOfParentTeam) {
    const childTeams = await prisma.team.findMany({
      where: {
        parentId: user.organizationId,
      },
      select: {
        id: true,
      },
    });

    if (childTeams.length > 0) {
      childrenTeamIds = childTeams.map((team) => team.id);
    }

    const eventTypeResult = await prisma.eventType.findMany({
      select: {
        id: true,
        slug: true,
        title: true,
        teamId: true,
        userId: true,
        team: {
          select: {
            name: true,
          },
        },
      },
      where: {
        OR: [
          {
            teamId: {
              in: [user.organizationId, ...childrenTeamIds],
            },
          },
          {
            userId: user.id,
            teamId: null,
          },
        ],
      },
    });

    return eventTypeResult;
  }

  if (teamId && !isAll) {
    membershipWhereConditional["teamId"] = teamId;
    membershipWhereConditional["userId"] = user.id;
  }

  // I'm not using unique here since when userId comes from input we should look for every
  // event type that user owns
  const membership = await prisma.membership.findFirst({
    where: membershipWhereConditional,
  });

  if (!membership && !user.isOwnerAdminOfParentTeam) {
    throw new Error("User is not part of a team/org");
  }

  const eventTypeWhereConditional: Prisma.EventTypeWhereInput = {};

  if (teamId && !isAll) {
    eventTypeWhereConditional["teamId"] = teamId;
  }

  let isMember = membership?.role === "MEMBER";
  if (user.isOwnerAdminOfParentTeam) {
    isMember = false;
  }

  if (isMember) {
    eventTypeWhereConditional["OR"] = [{ userId: user.id }, { users: { some: { id: user.id } } }];
    // @TODO this is not working as expected
    // hosts: { some: { id: user.id } },
  }

  const eventTypeResult = await prisma.eventType.findMany({
    select: {
      id: true,
      slug: true,
      title: true,
      teamId: true,
      userId: true,
      team: {
        select: {
          name: true,
        },
      },
    },
    where: eventTypeWhereConditional,
  });

  return eventTypeResult;
}
