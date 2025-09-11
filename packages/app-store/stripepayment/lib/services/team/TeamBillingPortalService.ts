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

  async getCustomerId(teamId: number): Promise<string | null> {
    const team = await this.teamRepository.findById({ id: teamId });
    if (!team) return null;

    const teamMetadataParsed = teamMetadataSchema.safeParse(team.metadata);

    if (!teamMetadataParsed.success || !teamMetadataParsed.data?.subscriptionId) {
      return null;
    }

    const subscription = await getSubscriptionFromId(teamMetadataParsed.data.subscriptionId);

    if (!subscription?.customer) {
      return null;
    }

    return subscription.customer as string;
  }
}
