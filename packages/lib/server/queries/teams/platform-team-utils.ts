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
    select: { createdByOAuthClientId: true },
  });

  const isPlatformTeam = !!team?.createdByOAuthClientId;

  if (isPlatformTeam) {
    const managedMemberships = await prisma.membership.findMany({
      where: {
        teamId,
        accepted: true,
        user: {
          isPlatformManaged: true,
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
