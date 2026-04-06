import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import { IS_TEAM_BILLING_ENABLED } from "@calcom/lib/constants";
import { prisma } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";
import type { TrpcSessionUser } from "../../../types";

type GetUpgradeableOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
};

export async function checkIfOrgNeedsUpgradeHandler({ ctx }: GetUpgradeableOptions) {
  if (!IS_TEAM_BILLING_ENABLED) return [];

  const permissionCheckService = new PermissionCheckService();
  const teamIdsWithBillingPermission = await permissionCheckService.getTeamIdsWithPermission({
    userId: ctx.user.id,
    permission: "organization.manageBilling",
    fallbackRoles: [MembershipRole.OWNER],
  });

  if (teamIdsWithBillingPermission.length === 0) return [];

  const teams = await prisma.membership.findMany({
    where: {
      userId: ctx.user.id,
      teamId: { in: teamIdsWithBillingPermission },
      team: {
        isPlatform: false,
        parentId: null,
        isOrganization: true,
        organizationBilling: null,
      },
    },
    select: {
      id: true,
      teamId: true,
      userId: true,
      role: true,
      accepted: true,
      team: {
        select: {
          id: true,
          name: true,
          slug: true,
          isOrganization: true,
          metadata: true,
        },
      },
    },
  });

  return teams;
}

export default checkIfOrgNeedsUpgradeHandler;
