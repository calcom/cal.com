import { MembershipRole } from "@calcom/prisma/enums";

import type { PermissionString } from "../domain/types/permission-registry";

export async function checkPermissionWithFallback({
  userId,
  teamId,
  permission,
  fallbackRoles,
}: {
  userId: number;
  teamId: number;
  permission: PermissionString;
  fallbackRoles: MembershipRole[];
}): Promise<boolean> {
  try {
    const { isTeamAdmin, isTeamOwner } = await import("@calcom/lib/server/queries/teams");
    const { isOrganisationAdmin } = await import("@calcom/lib/server/queries/organisations");
    const { prisma } = await import("@calcom/prisma");

    if (
      permission.startsWith("organization.") &&
      (fallbackRoles.includes(MembershipRole.ADMIN) || fallbackRoles.includes(MembershipRole.OWNER))
    ) {
      const isOrgAdmin = await isOrganisationAdmin(userId, teamId);
      if (isOrgAdmin) return true;
    }

    if (fallbackRoles.includes(MembershipRole.ADMIN) || fallbackRoles.includes(MembershipRole.OWNER)) {
      const teamAdminResult = await isTeamAdmin(userId, teamId);
      if (teamAdminResult) return true;
    }

    if (fallbackRoles.includes(MembershipRole.OWNER)) {
      const teamOwnerResult = await isTeamOwner(userId, teamId);
      if (teamOwnerResult) return true;
    }

    if (fallbackRoles.includes(MembershipRole.MEMBER)) {
      const team = await prisma.team.findFirst({
        where: {
          id: teamId,
          members: {
            some: {
              userId,
              role: {
                in: fallbackRoles,
              },
            },
          },
        },
      });
      if (team) return true;
    }

    return false;
  } catch (error) {
    return false;
  }
}
