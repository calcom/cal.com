import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import { MembershipRepository } from "@calcom/lib/server/repository/membership";
import { MembershipRole } from "@calcom/prisma/enums";

export async function hasInsightsPermission({
  userId,
  organizationId,
}: {
  userId: number;
  organizationId: number | null | undefined;
}) {
  if (organizationId) {
    const permissionCheckService = new PermissionCheckService();
    return await permissionCheckService.checkPermission({
      userId,
      teamId: organizationId,
      permission: "insights.read",
      fallbackRoles: [MembershipRole.OWNER, MembershipRole.ADMIN, MembershipRole.MEMBER], // even members can see their own data
    });
  } else {
    const permissionCheckService = new PermissionCheckService();
    const teamIds = await MembershipRepository.findUserTeamIds({ userId });

    for (const teamId of teamIds) {
      const hasPermission = await permissionCheckService.checkPermission({
        userId,
        teamId,
        permission: "insights.read",
        fallbackRoles: [MembershipRole.OWNER, MembershipRole.ADMIN, MembershipRole.MEMBER], // even members can see their own data
      });

      if (hasPermission) {
        return true;
      }
    }
  }

  return false;
}
