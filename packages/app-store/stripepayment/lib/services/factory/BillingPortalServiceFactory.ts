import { TeamRepository } from "@calcom/features/ee/teams/repositories/TeamRepository";
import prisma from "@calcom/prisma";
import type { BillingPortalService } from "../base/BillingPortalService";
import { OrganizationBillingPortalService } from "../organization/OrganizationBillingPortalService";
import { TeamBillingPortalService } from "../team/TeamBillingPortalService";
import { UserBillingPortalService } from "../user/UserBillingPortalService";

/**
 * Factory to create the appropriate billing portal service based on team type
 */
export class BillingPortalServiceFactory {
  /**
   * Determines team type and returns the appropriate service
   */
  static async createService(teamId: number): Promise<BillingPortalService> {
    const teamRepository = new TeamRepository(prisma);
    const team = await teamRepository.findById({ id: teamId });

    if (!team) {
      throw new Error("Team not found");
    }

    if (team.isOrganization) {
      return new OrganizationBillingPortalService();
    }

    return new TeamBillingPortalService();
  }

  /**
   * Creates a user billing portal service
   */
  static createUserService(): UserBillingPortalService {
    return new UserBillingPortalService();
  }
}
