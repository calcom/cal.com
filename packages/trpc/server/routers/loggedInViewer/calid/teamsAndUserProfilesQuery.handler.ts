import { getDefaultAvatar } from "@calid/features/lib/defaultAvatar";

import { getUserAvatarUrl } from "@calcom/lib/getAvatarUrl";
import type { PrismaClient } from "@calcom/prisma";
import { CalIdMembershipRole } from "@calcom/prisma/client";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import { TRPCError } from "@trpc/server";

function withRoleCanCreateCalIdEntity(role: CalIdMembershipRole) {
  return role === CalIdMembershipRole.ADMIN || role === CalIdMembershipRole.OWNER;
}

type CalIdTeamsAndUserProfileOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    prisma: PrismaClient;
  };
};

export const calIdTeamsAndUserProfilesQuery = async ({ ctx }: CalIdTeamsAndUserProfileOptions) => {
  const { prisma } = ctx;

  const user = await prisma.user.findUnique({
    where: {
      id: ctx.user.id,
    },
    select: {
      avatarUrl: true,
      id: true,
      username: true,
      name: true,
      calIdTeams: {
        where: {
          acceptedInvitation: true,
        },
        select: {
          role: true,
          calIdTeam: {
            select: {
              id: true,
              logoUrl: true,
              name: true,
              slug: true,
              metadata: true,
              members: {
                select: {
                  userId: true,
                },
              },
            },
          },
        },
      },
    },
  });
  if (!user) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
  }

  const teamsData = user.calIdTeams.map((membership) => ({
    ...membership,
    calIdTeam: {
      ...membership.calIdTeam,
      metadata: membership.calIdTeam.metadata || {},
    },
  }));

  return [
    {
      teamId: null,
      name: user.name,
      slug: user.username,
      image: getUserAvatarUrl({
        avatarUrl: user.avatarUrl,
      }),
      readOnly: false,
    },
    ...teamsData.map((membership) => ({
      teamId: membership.calIdTeam.id,
      name: membership.calIdTeam.name,
      slug: membership.calIdTeam.slug ? `team/${membership.calIdTeam.slug}` : null,
      image: getDefaultAvatar(membership.calIdTeam.logoUrl, membership.calIdTeam.name),
      role: membership.role,
      readOnly: !withRoleCanCreateCalIdEntity(membership.role),
    })),
  ];
};
