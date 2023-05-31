import { prisma } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";

/** Get a user's team & orgs they are admins/owners of. Abstracted to a function to call in tRPC endpoint and SSR. */
const getUserAdminTeams = async ({ userId, getUserInfo }: { userId: number; getUserInfo?: boolean }) => {
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

  if (getUserInfo) {
    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        name: true,
        avatar: true,
      },
    });

    if (user) {
      const userObject = { id: user.id, name: user.name || "Nameless", logo: user?.avatar, isUser: true };
      teams.unshift(userObject);
    }
  }

  return teams;
};

export default getUserAdminTeams;

export type UserAdminTeams =
  | (Awaited<Promise<ReturnType<typeof getUserAdminTeams>>>[number] & { isUser?: boolean })[]
  | [];
