import { type PrismaClient } from "@prisma/client";

import { CAL_URL } from "@calcom/lib/constants";
import { isOrganization, withRoleCanCreateEntity } from "@calcom/lib/entityPermissionUtils";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import { TRPCError } from "@trpc/server";

type TeamsAndUserProfileOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    prisma: PrismaClient;
  };
};

export const teamsAndUserProfilesQuery = async ({ ctx }: TeamsAndUserProfileOptions) => {
  const { prisma } = ctx;

  const user = await prisma.user.findUnique({
    where: {
      id: ctx.user.id,
    },
    select: {
      id: true,
      username: true,
      name: true,
      avatar: true,
      teams: {
        where: {
          accepted: true,
        },
        select: {
          role: true,
          team: {
            select: {
              id: true,
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
  const image = user?.username ? `${CAL_URL}/${user.username}/avatar.png` : undefined;
  const nonOrgTeams = user.teams.filter((membership) => !isOrganization({ team: membership.team }));

  return [
    {
      teamId: null,
      name: user.name,
      slug: user.username,
      image,
      readOnly: false,
    },
    ...nonOrgTeams.map((membership) => ({
      teamId: membership.team.id,
      name: membership.team.name,
      slug: membership.team.slug ? "team/" + membership.team.slug : null,
      image: `${CAL_URL}/team/${membership.team.slug}/avatar.png`,
      role: membership.role,
      readOnly: !withRoleCanCreateEntity(membership.role),
    })),
  ];
};
