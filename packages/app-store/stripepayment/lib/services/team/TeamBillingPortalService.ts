import logger from "@calcom/lib/logger";
import type { Prisma } from "@calcom/prisma/client";
import { MembershipRole } from "@calcom/prisma/enums";
import { teamMetadataSchema } from "@calcom/prisma/zod-utils";

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

  async getValidatedTeamSubscriptionId(metadata: Prisma.JsonValue) {
    const teamMetadataParsed = teamMetadataSchema.safeParse(metadata);

    if (!teamMetadataParsed.success || !teamMetadataParsed.data?.subscriptionId) {
      return null;
    }

    return teamMetadataParsed.data.subscriptionId;
  }

  async getValidatedTeamSubscriptionIdForPlatform(subscriptionId?: string | null) {
    if (!subscriptionId) {
      return null;
    }

    return subscriptionId;
  }

  async getCustomerId(teamId: number): Promise<string | null> {
    const log = logger.getSubLogger({ prefix: ["TeamBillingPortalService", "getCustomerId"] });

    const team = await this.teamRepository.findByIdIncludePlatformBilling({ id: teamId });
    if (!team) return null;

    let teamSubscriptionId = "";

    if (team.isPlatform) {
      const subscriptionId = await this.getValidatedTeamSubscriptionIdForPlatform(
        team.platformBilling?.subscriptionId
      );

      if (!subscriptionId) return null;
      teamSubscriptionId = subscriptionId;
    } else {
      const subscriptionId = await this.getValidatedTeamSubscriptionId(team.metadata);

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
