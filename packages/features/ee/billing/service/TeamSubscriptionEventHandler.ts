import logger from "@calcom/lib/logger";
import { TeamRepository } from "@calcom/lib/server/repository/team";

import type { IBillingRepository, IBillingRepositoryUpdateArgs } from "../repository/IBillingRepository";
import { IBillingRepositoryCreateArgs, Plan } from "../repository/IBillingRepository";
import { BillingRecord } from "../repository/IBillingRepository";
import { InternalTeamBilling } from "../teams/internal-team-billing";

type TSubscriptionUpdate = Omit<IBillingRepositoryUpdateArgs, "id">;

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
    const { subscriptionId } = subscription;
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
        teamId: team.id,
        planName: team.isOrganization ? Plan.ORGANIZATION : Plan.TEAM,
      });

      return;
    }

    // if (teamSubscriptionInDb && teamSubscriptionInDb.status !== subscriptionStatus) {
    if (this.hasSubscriptionChanged({ subscription, dbSubscription: teamSubscriptionInDb })) {
      await this.billingRepository.update({ ...subscription, id: teamSubscriptionInDb.id });
    }
  }

  private hasSubscriptionChanged({
    subscription,
    dbSubscription,
  }: {
    subscription: TSubscriptionUpdate;
    dbSubscription: BillingRecord;
  }) {
    const fieldsToCompare = ["status", "subscriptionTrialEnd", "subscriptionEnd"];

    return fieldsToCompare.some(
      (field) =>
        subscription[field as keyof TSubscriptionUpdate] !== dbSubscription[field as keyof BillingRecord]
    );
    return false;
  }
}
