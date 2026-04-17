import prisma from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";

class PermissionCheckService {
  constructor(_prisma?: unknown) {}
  async checkPermission(..._args: unknown[]) { return true; }
  async hasPermission(..._args: unknown[]) { return true; }
  async getTeamIdsWithPermission(..._args: unknown[]): Promise<number[]> { return []; }
}

export const isAdminForUser = async (adminUserId: number, memberUserId: number) => {
  const permissionCheckService = new PermissionCheckService();
  const adminTeamIds = await permissionCheckService.getTeamIdsWithPermission({
    userId: adminUserId,
    permission: "ooo.update",
    fallbackRoles: [MembershipRole.ADMIN, MembershipRole.OWNER],
  });

  if (adminTeamIds.length === 0) {
    return false;
  }

  const member = await prisma.membership.findFirst({
    where: {
      userId: memberUserId,
      accepted: true,
      teamId: {
        in: adminTeamIds,
      },
    },
    select: {
      id: true,
    },
  });

  return !!member?.id;
};
