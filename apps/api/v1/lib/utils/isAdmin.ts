import type { NextApiRequest } from "next";

import prisma from "@calcom/prisma";
import { UserPermissionRole, MembershipRole } from "@calcom/prisma/enums";

export const ScopeOfAdmin = {
  Instance: "Instance",
  TeamOwnerOrAdmin: "TeamOwnerOrAdmin",
  OrgOwnerOrAdmin: "OrgOwnerOrAdmin",
} as const;

export const isAdminGuard = async (req: NextApiRequest) => {
  const { userId } = req;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (!user) return { isAdmin: false, scope: null };

  const { role: userRole } = user;

  if (userRole === UserPermissionRole.ADMIN) return { isAdmin: true, scope: ScopeOfAdmin.Instance };

  const ownerOrAdminMemberships = await prisma.membership.findMany({
    where: {
      userId: userId,
      OR: [{ role: MembershipRole.OWNER }, { role: MembershipRole.ADMIN }],
    },
    include: {
      team: {
        select: {
          id: true,
          isOrganization: true,
        },
      },
    },
  });
  if (!ownerOrAdminMemberships.length) return { isAdmin: false, scope: null };

  const organizations = ownerOrAdminMemberships.filter(
    (membership) => membership.team.isOrganization === true
  );
  const isOrganization = !!organizations.length;

  if (isOrganization) return { isAdmin: true, scope: ScopeOfAdmin.OrgOwnerOrAdmin };

  return { isAdmin: true, scope: ScopeOfAdmin.TeamOwnerOrAdmin };
};
