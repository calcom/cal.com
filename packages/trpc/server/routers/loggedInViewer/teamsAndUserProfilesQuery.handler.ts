import { isOrganization, withRoleCanCreateEntity } from "@calcom/lib/entityPermissionUtils";
import { getTeamAvatarUrl, getUserAvatarUrl } from "@calcom/lib/getAvatarUrl";
import type { PrismaClient } from "@calcom/prisma";
import { teamMetadataSchema } from "@calcom/prisma/zod-utils";
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
              parentId: true,
              members: {
                select: {
                  userId: true,
                },
              },
            },
          },
        },
      },
      organizationId: true,
    },
  });
  if (!user) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
  }

  const nonOrgTeams = user.teams
    .filter((membership) => !isOrganization({ team: membership.team }))
    .map((membership) => ({
      ...membership,
      team: {
        ...membership.team,
        metadata: teamMetadataSchema.parse(membership.team.metadata),
      },
    }));

  return [
    {
      teamId: null,
      name: user.name,
      slug: user.username,
      image: getUserAvatarUrl(user),
      readOnly: false,
    },
    ...nonOrgTeams.map((membership) => ({
      teamId: membership.team.id,
      name: membership.team.name,
      slug: membership.team.slug ? `team/${membership.team.slug}` : null,
      image: getTeamAvatarUrl({
        slug: membership.team.slug,
        requestedSlug: membership.team.metadata?.requestedSlug ?? null,
        organizationId: membership.team.parentId,
      }),
      role: membership.role,
      readOnly: !withRoleCanCreateEntity(membership.role),
    })),
  ];
};
