import type { Prisma } from "@prisma/client";

import { prisma } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";

export type UserAdminTeams = (Prisma.TeamGetPayload<{
  select: {
    id: true;
    name: true;
    logoUrl: true;
    credentials?: true;
    parent?: {
      select: {
        id: true;
        name: true;
        logoUrl: true;
        credentials: true;
      };
    };
  };
}> & { isUser?: boolean })[];

/** Get a user's team & orgs they are admins/owners of. Abstracted to a function to call in tRPC endpoint and SSR. */
const getUserAdminTeams = async ({
  userId,
  getUserInfo,
  getParentInfo,
  includeCredentials = false,
}: {
  userId: number;
  getUserInfo?: boolean;
  getParentInfo?: boolean;
  includeCredentials?: boolean;
}): Promise<UserAdminTeams> => {
  const teams = await prisma.team.findMany({
    where: {
      members: {
        some: {
          userId: userId,
          accepted: true,
          role: { in: [MembershipRole.ADMIN, MembershipRole.OWNER] },
        },
      },
    },
    select: {
      id: true,
      name: true,
      logoUrl: true,
      ...(includeCredentials && { credentials: true }),
      ...(getParentInfo && {
        parent: {
          select: {
            id: true,
            name: true,
            logoUrl: true,
            credentials: true,
          },
        },
      }),
    },
    // FIXME - OrgNewSchema: Fix this orderBy
    // orderBy: {
    //   orgUsers: { _count: "desc" },
    // },
  });

  if (teams.length && getUserInfo) {
    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        name: true,
        avatarUrl: true,
        ...(includeCredentials && { credentials: true }),
      },
    });

    if (user) {
      const userObject = {
        id: user.id,
        name: user.name || "me",
        logoUrl: user?.avatarUrl, // bit ugly, no?
        isUser: true,
        credentials: includeCredentials ? user.credentials : [],
        parent: null,
      };
      teams.unshift(userObject);
    }
  }

  return teams;
};

export default getUserAdminTeams;
