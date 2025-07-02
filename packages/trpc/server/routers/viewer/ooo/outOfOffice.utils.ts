import { checkPermissionWithFallback } from "@calcom/features/pbac/lib/checkPermissionWithFallback";
import prisma from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";

export const isAdminForUser = async (adminUserId: number, memberUserId: number) => {
  const adminTeams = await prisma.membership.findMany({
    where: {
      userId: adminUserId,
      accepted: true,
    },
    select: {
      teamId: true,
    },
  });

  const adminTeamIds = adminTeams?.map((team) => team.teamId);

  const member = await prisma.membership.findFirst({
    where: {
      userId: memberUserId,
      accepted: true,
      teamId: {
        in: adminTeamIds,
      },
    },
    select: {
      id: true,
    },
  });

  if (!member?.id) return false;

  for (const teamId of adminTeamIds) {
    const hasPermission = await checkPermissionWithFallback({
      userId: adminUserId,
      teamId,
      permission: "team.update",
      fallbackRoles: [MembershipRole.ADMIN, MembershipRole.OWNER],
    });
    if (hasPermission) return true;
  }

  return false;
};
