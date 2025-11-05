import { getPlaceholderAvatar } from "@calcom/lib/defaultAvatarImage";
import { withRoleCanCreateEntity } from "@calcom/lib/entityPermissionUtils.server";
import { getUserAvatarUrl } from "@calcom/lib/getAvatarUrl";
import type { PrismaClient } from "@calcom/prisma";
import { teamMetadataSchema } from "@calcom/prisma/zod-utils";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import { TRPCError } from "@trpc/server";

import type { TTeamsAndUserProfilesQueryInputSchema } from "./teamsAndUserProfilesQuery.schema";

type TeamsAndUserProfileOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    prisma: PrismaClient;
  };
  input: TTeamsAndUserProfilesQueryInputSchema;
};

export const teamsAndUserProfilesQuery = async ({ ctx, input }: TeamsAndUserProfileOptions) => {
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
      teams: {
        where: {
          accepted: true,
        },
        select: {
          role: true,
          team: {
            select: {
              id: true,
              isOrganization: true,
              logoUrl: true,
              name: true,
              slug: true,
              metadata: true,
              parentId: true,
              parent: {
                select: {
                  logoUrl: true,
                  name: true,
                },
              },
              members: {
                select: {
                  userId: true,
                },
              },
            },
          },
        },
      },

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

  // let teamsData;

  // if (input?.includeOrg) {
  //   teamsData = user.calIdTeams
  //     .filter((membership) => membership.calIdTeam.slug !== null)
  //     .map((membership) => ({
  //       ...membership,
  //       calIdTeam: {
  //         ...membership.calIdTeam,
  //         metadata: teamMetadataSchema.parse(membership.calIdTeam.metadata),
  //       },
  //     }));
  // } else {
  //   teamsData = user.calIdTeams
  //     .filter((membership) => !membership.calIdTeam.isOrganization)
  //     .map((membership) => ({
  //       ...membership,
  //       calIdTeam: {
  //         ...membership.calIdTeam,
  //         metadata: teamMetadataSchema.parse(membership.calIdTeam.metadata),
  //       },
  //     }));
  // }
  const teamsData = user.calIdTeams
    .filter((membership) => membership.calIdTeam.slug !== null)
    .map((membership) => ({
      ...membership,
      calIdTeam: {
        ...membership.calIdTeam,
        metadata: teamMetadataSchema.parse(membership.calIdTeam.metadata),
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
      // image: membership.calIdTeam?.parent
      //   ? getPlaceholderAvatar(membership.calIdTeam.parent.logoUrl, membership.calIdTeam.parent.name)
      //   : getPlaceholderAvatar(membership.calIdTeam.logoUrl, membership.calIdTeam.name),
      image: getPlaceholderAvatar(membership.calIdTeam.logoUrl, membership.calIdTeam.name),
      role: membership.role,
      readOnly: !withRoleCanCreateEntity(membership.role),
    })),
  ];
};
