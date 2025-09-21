import prisma from "@calcom/prisma";

export async function isTeamAdmin(userId: number, teamId: number) {
  const team = await prisma.membership.findFirst({
    where: {
      userId,
      teamId,
      accepted: true,
      OR: [{ role: "ADMIN" }, { role: "OWNER" }],
    },
    include: {
      team: {
        select: {
          metadata: true,
          parentId: true,
          isOrganization: true,
        },
      },
    },
  });
  if (!team) return false;
  return team;
}

export async function isTeamOwner(userId: number, teamId: number) {
  return !!(await prisma.membership.findFirst({
    where: {
      userId,
      teamId,
      accepted: true,
      role: "OWNER",
    },
  }));
}

export async function isTeamMember(userId: number, teamId: number) {
  return !!(await prisma.membership.findFirst({
    where: {
      userId,
      teamId,
      accepted: true,
    },
  }));
}

export async function getTeamDataForAdmin(userId: number, organizationId?: number | null) {
  const memberships = await prisma.membership.findMany({
    where: {
      userId,
      accepted: true,
      role: {
        in: ["ADMIN", "OWNER"],
      },
      ...((organizationId ?? null) !== null
        ? {
            OR: [{ teamId: organizationId as number }, { team: { parentId: organizationId as number } }],
          }
        : {}),
    },
    select: {
      team: {
        select: {
          eventTypes: {
            select: {
              id: true,
            },
          },
          members: {
            where: {
              accepted: true,
            },
            select: {
              user: {
                select: {
                  id: true,
                  email: true,
                },
              },
            },
          },
        },
      },
    },
  });

  const eventTypeIds = new Set<number>();
  const userIds = new Set<number>();
  const userEmails = new Set<string>();

  for (const membership of memberships) {
    if (membership.team) {
      for (const eventType of membership.team.eventTypes) {
        eventTypeIds.add(eventType.id);
      }
      for (const member of membership.team.members) {
        if (member.user) {
          userIds.add(member.user.id);
          userEmails.add(member.user.email);
        }
      }
    }
  }

  return {
    eventTypeIds: Array.from(eventTypeIds),
    userIds: Array.from(userIds),
    userEmails: Array.from(userEmails),
  };
}
