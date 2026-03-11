import type { DunningBannerRecord } from "@calcom/ee/billing/service/dunning/IDunningService";
import { getDunningServiceFactory } from "@calcom/features/ee/billing/di/containers/Billing";
import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import { MembershipRole } from "@calcom/prisma/enums";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

type Props = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
};

const MANAGE_BILLING_FALLBACK_ROLES = [MembershipRole.ADMIN, MembershipRole.OWNER];

export const getDueInvoiceBannerDataHandler = async ({ ctx }: Props): Promise<DunningBannerRecord[]> => {
  const { user } = ctx;
  const permissionCheckService = new PermissionCheckService();

  let idsToCheck: number[];

  if (user.organizationId) {
    const canManageBilling = await permissionCheckService.checkPermission({
      userId: user.id,
      teamId: user.organizationId,
      permission: "organization.manageBilling",
      fallbackRoles: MANAGE_BILLING_FALLBACK_ROLES,
    });
    idsToCheck = canManageBilling ? [user.organizationId] : [];
  } else {
    idsToCheck = await permissionCheckService.getTeamIdsWithPermission({
      userId: user.id,
      permission: "team.manageBilling",
      fallbackRoles: MANAGE_BILLING_FALLBACK_ROLES,
    });
  }

  const factory = getDunningServiceFactory();
  const results: DunningBannerRecord[] = [];
  const seen = new Set<string>();

  await Promise.all(
    idsToCheck.map(async (teamId) => {
      const resolved = await factory.forTeam(teamId);
      if (!resolved || seen.has(resolved.billingId)) return;
      seen.add(resolved.billingId);

      const banners = await resolved.service.getBannerData([resolved.billingId]);
      results.push(...banners);
    })
  );

  return results;
};
