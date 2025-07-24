import type { Prisma } from "@prisma/client";

import { checkAdminOrOwner } from "@calcom/features/auth/lib/checkAdminOrOwner";
import { RoleManagementFactory } from "@calcom/features/pbac/services/role-management.factory";
import { getBookerBaseUrlSync } from "@calcom/lib/getBookerUrl/client";
import { TeamRepository } from "@calcom/lib/server/repository/team";
import { UserRepository } from "@calcom/lib/server/repository/user";
import { prisma } from "@calcom/prisma";
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

  const membersWithApps = await Promise.all(
    teamMembers.map(async (member) => {
      const user = await new UserRepository(prisma).enrichUserWithItsProfile({
        user: member.user,
      });
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
  );

  return {
    members: membersWithApps,
    nextCursor,
    meta: {
      totalRowCount: totalMembers,
    },
  };
};

const checkCanAccessMembers = async (ctx: ListMembersHandlerOptions["ctx"], teamId: number) => {
  const isOrgPrivate = ctx.user.profile?.organization?.isPrivate;
  const isOrgAdminOrOwner = ctx.user.organization?.isOrgAdmin;
  const orgId = ctx.user.organizationId;
  const isTargetingOrg = teamId === ctx.user.organizationId;

  if (isTargetingOrg) {
    return isOrgAdminOrOwner || !isOrgPrivate;
  }
  const team = await prisma.team.findUnique({
    where: {
      id: teamId,
    },
  });

  if (!team) return false;

  if (isOrgAdminOrOwner && team?.parentId === orgId) {
    return true;
  }

  const membership = await prisma.membership.findFirst({
    where: {
      teamId,
      userId: ctx.user.id,
      accepted: true,
    },
  });

  if (!membership) return false;

  const isTeamAdminOrOwner = checkAdminOrOwner(membership?.role);

  if (team?.isPrivate && !isTeamAdminOrOwner) {
    return false;
  }
  return true;
};

export default listMembersHandler;
