import type { NextApiRequest } from "next";

import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import prisma from "@calcom/prisma";
import { UserPermissionRole, MembershipRole } from "@calcom/prisma/enums";

import { ScopeOfAdmin } from "./scopeOfAdmin";

export const isAdminGuard = async (req: NextApiRequest) => {
  const { user, userId } = req;
  if (!user) return { isAdmin: false, scope: null };

  const { role: userRole } = user;
  if (userRole === UserPermissionRole.ADMIN) return { isAdmin: true, scope: ScopeOfAdmin.SystemWide };

  const usersOrgMemberships = await prisma.membership.findMany({
    where: {
      userId: userId,
      accepted: true,
      team: {
        isOrganization: true,
        organizationSettings: {
          isAdminAPIEnabled: true,
        },
      },
    },
    select: {
      team: {
        select: {
          id: true,
          isOrganization: true,
        },
      },
    },
  });

  if (usersOrgMemberships.length > 0) {
    const permissionCheckService = new PermissionCheckService();

    // Check PBAC permissions for each organization
    // This should only ever be one membership as we only support one org currently.
    for (const membership of usersOrgMemberships) {
      const teamId = membership.team.id;

      const hasAdminPermission = await permissionCheckService.checkPermission({
        userId,
        teamId,
        permission: "organization.adminApi",
        fallbackRoles: [MembershipRole.OWNER, MembershipRole.ADMIN],
      });

      if (hasAdminPermission) {
        return { isAdmin: true, scope: ScopeOfAdmin.OrgOwnerOrAdmin };
      }
    }
  }

  return { isAdmin: false, scope: null };
};
