import prisma from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";

export const isAdminForUser = async (adminUserId: number, memberUserId: number) => {
  const adminTeams = await prisma.membership.findMany({
    where: {
      userId: adminUserId,
      accepted: true,
      role: {
        in: [MembershipRole.ADMIN, MembershipRole.OWNER],
      },
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

  return !!member?.id;
};
