import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import { prisma } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";

import type { TrpcSessionUser } from "../../../types";
import type { TGetMembersInputSchema } from "./getMembers.schema";

type CreateOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TGetMembersInputSchema;
};

export const getMembersHandler = async ({ input, ctx }: CreateOptions) => {
  const { teamIdToExclude, accepted, distinctUser } = input;

  if (!ctx.user.organizationId) return [];

  const isOrgPrivate = ctx.user.organization.isPrivate;

  const permissionCheckService = new PermissionCheckService();

  const hasPermissionToViewMembers = await permissionCheckService.checkPermission({
    userId: ctx.user.id,
    teamId: ctx.user.organizationId,
    permission: ctx.user.organization.isPrivate
      ? "organization.listMembersPrivate"
      : "organization.listMembers",
    fallbackRoles: ctx.user.organization.isPrivate
      ? [MembershipRole.ADMIN, MembershipRole.OWNER]
      : [MembershipRole.MEMBER, MembershipRole.ADMIN, MembershipRole.OWNER],
  });

  if (!hasPermissionToViewMembers) return [];

  const teamQuery = await prisma.team.findUnique({
    where: {
      id: ctx.user.organizationId,
    },
    select: {
      members: {
        where: {
          teamId: {
            not: teamIdToExclude,
          },
          accepted,
        },
        select: {
          accepted: true,
          disableImpersonation: true,
          id: true,
          teamId: true,
          role: true,
          userId: true,
          user: {
            select: {
              id: true,
              username: true,
              avatarUrl: true,
              email: true,
              completedOnboarding: true,
              name: true,
            },
          },
        },
        ...(distinctUser && {
          distinct: ["userId"],
        }),
      },
    },
  });

  if (teamIdToExclude && teamQuery?.members) {
    const excludedteamUsers = await prisma.team.findUnique({
      where: {
        id: teamIdToExclude,
      },
      select: {
        members: {
          select: {
            userId: true,
          },
        },
      },
    });
    const excludedUserIds = excludedteamUsers?.members.map((item) => item.userId) ?? [];
    teamQuery.members = teamQuery?.members.filter((member) => !excludedUserIds.includes(member.userId));
  }

  return teamQuery?.members || [];
};

export default getMembersHandler;
