import type { PrismaClient } from "@calcom/prisma";

export async function getTeamUserIds({
  teamId,
  prisma,
}: {
  teamId: number;
  prisma: PrismaClient;
}): Promise<number[]> {
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: { createdByOAuthClientId: true, parentId: true },
  });

  const isPlatformTeam = !!team?.createdByOAuthClientId;

  if (isPlatformTeam) {
    const orgAdminUserIds = team.parentId
      ? await prisma.membership
          .findMany({
            where: {
              teamId: team.parentId,
              accepted: true,
              OR: [{ role: "ADMIN" }, { role: "OWNER" }],
            },
            select: { userId: true },
          })
          .then((memberships) => memberships.map((m) => m.userId))
      : [];

    const managedMemberships = await prisma.membership.findMany({
      where: {
        teamId,
        accepted: true,
        user: {
          isPlatformManaged: true,
          id: { notIn: orgAdminUserIds },
        },
      },
      select: { userId: true },
    });
    return managedMemberships.map((membership) => membership.userId);
  } else {
    const allMemberships = await prisma.membership.findMany({
      where: {
        teamId,
        accepted: true,
      },
      select: { userId: true },
    });
    return allMemberships.map((membership) => membership.userId);
  }
}

export async function isPlatformTeam({
  teamId,
  prisma,
}: {
  teamId: number;
  prisma: PrismaClient;
}): Promise<boolean> {
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: { createdByOAuthClientId: true },
  });

  return !!team?.createdByOAuthClientId;
}

export async function isUserOrgAdmin({
  userId,
  orgId,
  prisma,
}: {
  userId: number;
  orgId: number;
  prisma: PrismaClient;
}): Promise<boolean> {
  const adminMembership = await prisma.membership.findFirst({
    where: {
      userId,
      teamId: orgId,
      accepted: true,
      OR: [{ role: "ADMIN" }, { role: "OWNER" }],
    },
  });

  return !!adminMembership;
}
