import prisma from "@calcom/prisma";
import { MembershipRole, UserPermissionRole } from "@calcom/prisma/enums";
import type { NextApiRequest } from "next";
import { ScopeOfAdmin } from "./scopeOfAdmin";

export const isAdminGuard = async (req: NextApiRequest) => {
  const { user, userId } = req;
  if (!user) return { isAdmin: false, scope: null };

  const { role: userRole } = user;
  if (userRole === UserPermissionRole.ADMIN) return { isAdmin: true, scope: ScopeOfAdmin.SystemWide };

  const orgOwnerOrAdminMemberships = await prisma.membership.findMany({
    where: {
      userId: userId,
      accepted: true,
      role: {
        in: [MembershipRole.OWNER, MembershipRole.ADMIN],
      },
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
  if (orgOwnerOrAdminMemberships.length > 0) return { isAdmin: true, scope: ScopeOfAdmin.OrgOwnerOrAdmin };

  return { isAdmin: false, scope: null };
};
