import { getBookerBaseUrlSync } from "@calcom/features/ee/organizations/lib/getBookerBaseUrlSync";
import { TeamRepository } from "@calcom/features/ee/teams/repositories/TeamRepository";
import {
  Resource,
  CustomAction,
  PermissionString,
} from "@calcom/features/pbac/domain/types/permission-registry";
import { getSpecificPermissions } from "@calcom/features/pbac/lib/resource-permissions";
import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import { RoleManagementFactory } from "@calcom/features/pbac/services/role-management.factory";
import { UserRepository } from "@calcom/features/users/repositories/UserRepository";
import { prisma } from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";
import { MembershipRole } from "@calcom/prisma/enums";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import { TRPCError } from "@trpc/server";

import type { TListMembersInputSchema } from "./listMembers.schema";

type ListMembersHandlerOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TListMembersInputSchema;
};

const userSelect = {
  username: true,
  email: true,
  name: true,
  avatarUrl: true,
  id: true,
  bio: true,
  disableImpersonation: true,
  lastActiveAt: true,
} satisfies Prisma.UserSelect;

export const listMembersHandler = async ({ ctx, input }: ListMembersHandlerOptions) => {
  const { cursor, limit, teamId, searchTerm } = input;

  const canAccessMembers = await checkCanAccessMembers(ctx, teamId);

  if (!canAccessMembers) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You are not authorized to see members of any teams",
    });
  }

  const whereCondition: Prisma.MembershipWhereInput = {
    teamId,
  };

  if (searchTerm) {
    whereCondition.user = {
      OR: [
        { email: { contains: searchTerm, mode: "insensitive" } },
        { username: { contains: searchTerm, mode: "insensitive" } },
        { name: { contains: searchTerm, mode: "insensitive" } },
      ],
    };
  }

  const totalMembers = await prisma.membership.count({ where: whereCondition });

  const teamMembers = await prisma.membership.findMany({
    where: whereCondition,
    select: {
      id: true,
      role: true,
      accepted: true,
      teamId: true,
      customRoleId: true,
      user: { select: userSelect },
    },
    cursor: cursor ? { id: cursor } : undefined,
    take: limit + 1,
    orderBy: { id: "asc" },
  });

  let nextCursor: typeof cursor | undefined = undefined;
  if (teamMembers.length > limit) {
    const nextItem = teamMembers.pop();
    nextCursor = nextItem?.id;
  }

  const teamRepo = new TeamRepository(prisma);
  const team = await teamRepo.findById({ id: input.teamId });

  const organizationId = team?.parentId || teamId;

  // Get custom roles if PBAC is enabled
  let customRoles: { [key: string]: { id: string; name: string } } = {};
  try {
    const roleManager = await RoleManagementFactory.getInstance().createRoleManager(organizationId);
    if (roleManager.isPBACEnabled) {
      const roles = await roleManager.getTeamRoles(teamId);
      customRoles = roles.reduce((acc, role) => {
        acc[role.id] = role;
        return acc;
      }, {} as { [key: string]: { id: string; name: string } });
    }
  } catch (error) {
    // PBAC not enabled or error occurred, continue with traditional roles
  }

  const users = teamMembers.map((member) => member.user);
  const enrichedUsers = await new UserRepository(prisma).enrichUsersWithTheirProfileExcludingOrgMetadata(
    users
  );

  const enrichedUserMap = new Map<number, (typeof enrichedUsers)[0]>();
  enrichedUsers.forEach((enrichedUser) => {
    enrichedUserMap.set(enrichedUser.id, enrichedUser);
  });

  const membersWithApps = teamMembers
    .map((member) => {
      const user = enrichedUserMap.get(member.user.id);
      if (!user) {
        return null;
      }

      const { profile, ...restUser } = user;

      // Determine the role to display
      let customRole = null;

      if (member.customRoleId && customRoles[member.customRoleId]) {
        customRole = customRoles[member.customRoleId];
      }
      return {
        ...restUser,
        username: profile?.username ?? restUser.username,
        role: member.role,
        customRoleId: member.customRoleId,
        customRole,
        profile: profile,
        organizationId: profile?.organizationId ?? null,
        organization: profile?.organization,
        accepted: member.accepted,
        disableImpersonation: user.disableImpersonation,
        bookerUrl: getBookerBaseUrlSync(profile?.organization?.slug || ""),
        teamId: member.teamId,
        lastActiveAt: member.user.lastActiveAt
          ? new Intl.DateTimeFormat(ctx.user.locale, {
              timeZone: ctx.user.timeZone,
            })
              .format(member.user.lastActiveAt)
              .toLowerCase()
          : null,
      };
    })
    .filter((member): member is NonNullable<typeof member> => member !== null);

  return {
    members: membersWithApps,
    nextCursor,
    meta: {
      totalRowCount: totalMembers,
    },
  };
};

const checkCanAccessMembers = async (ctx: ListMembersHandlerOptions["ctx"], teamId: number) => {
  const isTargetingOrg = teamId === ctx.user.organizationId;

  // Get team info to check if it's private
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: { isPrivate: true },
  });

  if (!team) return false;

  // Determine the resource type based on whether this is an org or team
  const resource = isTargetingOrg ? Resource.Organization : Resource.Team;
  const targetAction = team.isPrivate ? CustomAction.ListMembersPrivate : CustomAction.ListMembers;
  const permissionString = `${resource}.${targetAction}` as PermissionString;

  // Check PBAC permissions for listing members
  const permissionCheckService = new PermissionCheckService();

  return permissionCheckService.checkPermission({
    userId: ctx.user.id,
    teamId: teamId,
    permission: permissionString,
    fallbackRoles: team.isPrivate
      ? [MembershipRole.ADMIN, MembershipRole.OWNER]
      : [MembershipRole.MEMBER, MembershipRole.ADMIN, MembershipRole.OWNER],
  });
};

export default listMembersHandler;
