import logger from "@calcom/lib/logger";
import { MembershipRole } from "@calcom/prisma/enums";
import { teamMetadataSchema } from "@calcom/prisma/zod-utils";

import { getSubscriptionFromId } from "../../subscriptions";
import { BillingPortalService } from "../base/BillingPortalService";

/**
 * Billing portal service for organizations
 */
export class OrganizationBillingPortalService extends BillingPortalService {
  constructor() {
    super();
    this.contextName = "Organization";
  }

  async checkPermissions(userId: number, teamId: number): Promise<boolean> {
    return await this.permissionService.checkPermission({
      userId,
      teamId,
      permission: "organization.manageBilling",
      fallbackRoles: [MembershipRole.ADMIN, MembershipRole.OWNER],
    });
  }

  async getCustomerId(teamId: number): Promise<string | null> {
    const log = logger.getSubLogger({ prefix: ["OrganizationBillingPortalService", "getCustomerId"] });

    const team = await this.teamRepository.findById({ id: teamId });
    if (!team) return null;

    const teamMetadataParsed = teamMetadataSchema.safeParse(team.metadata);

    if (!teamMetadataParsed.success || !teamMetadataParsed.data?.subscriptionId) {
      return null;
    }

    try {
      const subscription = await getSubscriptionFromId(teamMetadataParsed.data.subscriptionId);

      if (!subscription?.customer) {
        log.warn("Subscription found but no customer ID", {
          teamId,
          subscriptionId: teamMetadataParsed.data.subscriptionId,
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
