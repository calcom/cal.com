import logger from "@calcom/lib/logger";
import { MembershipRole } from "@calcom/prisma/enums";

import { getSubscriptionFromId } from "../../subscriptions";
import { BillingPortalService } from "../base/BillingPortalService";

/**
 * Billing portal service for regular teams
 */
export class TeamBillingPortalService extends BillingPortalService {
  async checkPermissions(userId: number, teamId: number): Promise<boolean> {
    return await this.permissionService.checkPermission({
      userId,
      teamId,
      permission: "team.manageBilling",
      fallbackRoles: [MembershipRole.ADMIN, MembershipRole.OWNER],
    });
  }

  async getCustomerId(teamId: number): Promise<string | null> {
    const log = logger.getSubLogger({ prefix: ["TeamBillingPortalService", "getCustomerId"] });

    const team = await this.teamRepository.findByIdIncludePlatformBilling({ id: teamId });
    if (!team) return null;

    let teamSubscriptionId = "";

    if (team.isPlatform) {
      const subscriptionId = this.getValidatedTeamSubscriptionIdForPlatform(
        team.platformBilling?.subscriptionId
      );

      if (!subscriptionId) return null;
      teamSubscriptionId = subscriptionId;
    } else {
      const subscriptionId = this.getValidatedTeamSubscriptionId(team.metadata);

      if (!subscriptionId) return null;
      teamSubscriptionId = subscriptionId;
    }

    try {
      const subscription = await getSubscriptionFromId(teamSubscriptionId);

      if (!subscription?.customer) {
        log.warn("Subscription found but no customer ID", {
          teamId,
          teamSubscriptionId,
        });
        return null;
      }

      return subscription.customer as string;
    } catch (error) {
      log.error("Failed to retrieve subscription", { teamId, error });
      return null;
    }
  }
}
