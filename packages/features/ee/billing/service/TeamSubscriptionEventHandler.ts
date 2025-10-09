import logger from "@calcom/lib/logger";
import { TeamRepository } from "@calcom/lib/server/repository/team";

import type { IBillingRepository, SubscriptionStatus } from "../repository/IBillingRepository";
import { Plan } from "../repository/IBillingRepository";
import { InternalTeamBilling } from "../teams/internal-team-billing";

export class TeamSubscriptionEventHandler {
  constructor(
    private readonly billingRepository: IBillingRepository,
    private readonly teamRepository: TeamRepository
  ) {
    this.billingRepository = billingRepository;
    this.teamRepository = teamRepository;
  }

  async handleUpdate({
    subscriptionId,
    subscriptionItemId,
    customerId,
    subscriptionStatus,
  }: {
    subscriptionId: string;
    subscriptionItemId: string;
    customerId: string;
    subscriptionStatus: SubscriptionStatus;
  }) {
    const log = logger.getSubLogger({ prefix: ["TeamSubscriptionEventHandler.handleUpdate"] });
    // First see if the subscription is already in the billing table
    const teamSubscriptionInDb = await this.billingRepository.getBySubscriptionId(subscriptionId);

    // If the subscription doesn't exist in the DB, migrate it
    if (!teamSubscriptionInDb) {
      const team = await this.teamRepository.findBySubscriptionId(subscriptionId);

      if (!team) {
        log.error("Team not found for subscription", subscriptionId);
        throw new Error(`Team not found for subscription ${subscriptionId}`);
      }

      const internalTeamBillingService = new InternalTeamBilling(team);
      await internalTeamBillingService.saveTeamBilling({
        teamId: team.id,
        subscriptionId: subscriptionId,
        subscriptionItemId: subscriptionItemId,
        status: subscriptionStatus,
        customerId: customerId,
        planName: Plan.TEAM,
      });
    }

    if (teamSubscriptionInDb && teamSubscriptionInDb.status !== subscriptionStatus) {
      await this.billingRepository.updateSubscriptionStatus(subscriptionId, subscriptionStatus);
    }
  }
}
