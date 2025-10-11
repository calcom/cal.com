import logger from "@calcom/lib/logger";
import { TeamRepository } from "@calcom/lib/server/repository/team";

import type { IBillingRepository } from "../repository/IBillingRepository";
import { IBillingRepositoryCreateArgs } from "../repository/IBillingRepository";
import { BillingRecord } from "../repository/IBillingRepository";
import { InternalTeamBilling } from "../teams/internal-team-billing";

export class TeamSubscriptionEventHandler {
  constructor(
    private readonly billingRepository: IBillingRepository,
    private readonly teamRepository: TeamRepository
  ) {
    this.billingRepository = billingRepository;
    this.teamRepository = teamRepository;
  }

  async handleUpdate(subscription: Omit<IBillingRepositoryCreateArgs, "teamId" | "planName">) {
    const log = logger.getSubLogger({ prefix: ["TeamSubscriptionEventHandler.handleUpdate"] });
    const { subscriptionId, status: subscriptionStatus } = subscription;
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
        ...subscription,
      });

      return;
    }

    // if (teamSubscriptionInDb && teamSubscriptionInDb.status !== subscriptionStatus) {
    if (this.hasSubscriptionChanged({ subscription, dbSubscription: teamSubscriptionInDb })) {
      await this.billingRepository.updateSubscriptionStatus(subscriptionId, subscriptionStatus);
    }
  }

  private hasSubscriptionChanged({
    subscription,
    dbSubscription,
  }: {
    subscription: IBillingRepositoryCreateArgs;
    dbSubscription: BillingRecord;
  }) {
    const fieldsToCompare = ["status", "subscriptionTrialEnd", "subscriptionEnd"];

    return fieldsToCompare.some(
      (field) =>
        subscription[field as keyof IBillingRepositoryCreateArgs] !==
        dbSubscription[field as keyof BillingRecord]
    );
    return false;
  }
}
