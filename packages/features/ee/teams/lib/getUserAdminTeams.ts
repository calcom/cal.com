import { prisma } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";

export type UserAdminTeams = number[];

export const getUserAdminTeams = async (userId: number): Promise<number[]> => {
  const user = await prisma.user.findFirst({
    where: {
      id: userId,
    },
    select: {
      teams: {
        where: {
          accepted: true,
          role: { in: [MembershipRole.ADMIN, MembershipRole.OWNER] },
        },
        select: { teamId: true },
      },
    },
  });

  const teamIds = [];
  for (const team of user?.teams || []) {
    teamIds.push(team.teamId);
  }
  return teamIds;
};

export default getUserAdminTeams;
