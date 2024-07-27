import type { NextApiRequest } from "next";

import prisma from "@calcom/prisma";
import { UserPermissionRole, MembershipRole } from "@calcom/prisma/enums";

import { ScopeOfAdmin } from "./scopeOfAdmin";

export const isAdminGuard = async (req: NextApiRequest) => {
  const { userId } = req;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (!user) return { isAdmin: false, scope: null };

  const { role: userRole } = user;
  if (userRole === UserPermissionRole.ADMIN) return { isAdmin: true, scope: ScopeOfAdmin.SystemWide };

  const orgOwnerOrAdminMemberships = await prisma.membership.findMany({
    where: {
      userId: userId,
      accepted: true,
      team: {
        isOrganization: true,
      },
      OR: [{ role: MembershipRole.OWNER }, { role: MembershipRole.ADMIN }],
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
  if (!orgOwnerOrAdminMemberships.length) return { isAdmin: false, scope: null };

  return { isAdmin: true, scope: ScopeOfAdmin.OrgOwnerOrAdmin };
};
