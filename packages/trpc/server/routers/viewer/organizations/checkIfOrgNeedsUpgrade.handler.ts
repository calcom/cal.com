import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import { IS_TEAM_BILLING_ENABLED } from "@calcom/lib/constants";
import { prisma } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";
import { teamMetadataSchema } from "@calcom/prisma/zod-utils";
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

  let teams = await prisma.membership.findMany({
    where: {
      userId: ctx.user.id,
      teamId: { in: teamIdsWithBillingPermission },
      team: {
        isPlatform: false,
        parentId: null,
      },
    },
    include: {
      team: true,
    },
  });

  /** We only need to return teams that don't have a `subscriptionId` on their metadata */
  teams = teams.filter((m) => {
    const metadata = teamMetadataSchema.safeParse(m.team.metadata);
    if (!m.team.isOrganization) return false;
    if (metadata.success && metadata.data?.subscriptionId) return false;
    return true;
  });

  return teams;
}

export default checkIfOrgNeedsUpgradeHandler;
