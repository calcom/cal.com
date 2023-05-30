import { prisma } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";

/** Get a user's team & orgs they are admins/owners of. Abstracted to a function to call in tRPC endpoint and SSR. */
const getUserAdminTeams = async (userId: number) => {
  const teams = await prisma.team.findMany({
    where: {
      members: {
        some: {
          userId: userId,
          role: { in: [MembershipRole.ADMIN, MembershipRole.OWNER] },
        },
      },
    },
    select: {
      id: true,
      name: true,
      logo: true,
    },
  });

  return teams;
};

export default getUserAdminTeams;
