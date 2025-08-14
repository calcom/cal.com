import type { PermissionString } from "@calcom/features/pbac/domain/types/permission-registry";
import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import { getPlaceholderAvatar } from "@calcom/lib/defaultAvatarImage";
import { withRoleCanCreateEntity } from "@calcom/lib/entityPermissionUtils.server";
import { getUserAvatarUrl } from "@calcom/lib/getAvatarUrl";
import type { PrismaClient } from "@calcom/prisma";
import type { MembershipRole } from "@calcom/prisma/enums";
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
    },
  });
  if (!user) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
  }

  let teamsData;

  if (input?.includeOrg) {
    teamsData = user.teams
      .filter((membership) => membership.team.slug !== null)
      .map((membership) => ({
        ...membership,
        team: {
          ...membership.team,
          metadata: teamMetadataSchema.parse(membership.team.metadata),
        },
      }));
  } else {
    teamsData = user.teams
      .filter((membership) => !membership.team.isOrganization)
      .map((membership) => ({
        ...membership,
        team: {
          ...membership.team,
          metadata: teamMetadataSchema.parse(membership.team.metadata),
        },
      }));
  }

  // Filter teams based on permission if provided
  let hasPermissionForFiltered: boolean[] = [];
  if (input?.withPermission) {
    const permissionService = new PermissionCheckService();
    const { permission, fallbackRoles } = input.withPermission;

    const permissionChecks = await Promise.all(
      teamsData.map((membership) =>
        permissionService.checkPermission({
          userId: ctx.user.id,
          teamId: membership.team.id,
          permission: permission as PermissionString,
          fallbackRoles: fallbackRoles ? (fallbackRoles as MembershipRole[]) : [],
        })
      )
    );

    // Store permission results for teams that passed the filter
    hasPermissionForFiltered = permissionChecks.filter((hasPermission) => hasPermission);
    teamsData = teamsData.filter((_, index) => permissionChecks[index]);

  }

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
    ...teamsData.map((membership, index) => ({
      teamId: membership.team.id,
      name: membership.team.name,
      slug: membership.team.slug ? `team/${membership.team.slug}` : null,
      image: membership.team?.parent
        ? getPlaceholderAvatar(membership.team.parent.logoUrl, membership.team.parent.name)
        : getPlaceholderAvatar(membership.team.logoUrl, membership.team.name),
      role: membership.role,
      readOnly: input?.withPermission
        ? !hasPermissionForFiltered[index]
        : !withRoleCanCreateEntity(membership.role),
    })),
  ];
};
