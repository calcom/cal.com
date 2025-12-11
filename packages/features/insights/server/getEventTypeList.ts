import type { PrismaClient } from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";

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
