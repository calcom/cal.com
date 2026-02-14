import logger from "@calcom/lib/logger";

import type { ActiveUserBillingService } from "../../active-user/services/ActiveUserBillingService";
import type { ITeamBillingDataRepository } from "../../repository/teamBillingData/ITeamBillingDataRepository";
import type { IBillingProviderService } from "../billingProvider/IBillingProviderService";
import { BaseSeatBillingStrategy } from "./ISeatBillingStrategy";
import type { SeatChangeContext } from "./ISeatBillingStrategy";

const log = logger.getSubLogger({ prefix: ["ActiveUserBillingStrategy"] });

export interface IActiveUserBillingStrategyDeps {
  activeUserBillingService: ActiveUserBillingService;
  billingProviderService: IBillingProviderService;
  teamBillingDataRepository: ITeamBillingDataRepository;
}

export class ActiveUserBillingStrategy extends BaseSeatBillingStrategy {
  constructor(private readonly deps: IActiveUserBillingStrategyDeps) {
    super();
  }

  async onSeatChange(_context: SeatChangeContext): Promise<void> {
    // No-op: active user count is determined at billing time, not on seat changes
  }

  override async onInvoiceUpcoming(subscriptionId: string): Promise<{ applied: boolean }> {
    const team = await this.deps.teamBillingDataRepository.findBySubscriptionId(subscriptionId);
    if (!team) {
      log.warn(`No team found for subscription ${subscriptionId}`);
      return { applied: false };
    }

    const subscription = await this.deps.billingProviderService.getSubscription(subscriptionId);
    if (!subscription) {
      log.warn(`No subscription found for ${subscriptionId}`);
      return { applied: false };
    }

    const periodStart = new Date(subscription.current_period_start * 1000);
    const periodEnd = new Date(subscription.current_period_end * 1000);

    const activeUserCount = await this.deps.activeUserBillingService.getActiveUserCountForOrg(
      team.id,
      periodStart,
      periodEnd
    );

    const subscriptionItem = subscription.items[0];
    if (!subscriptionItem) {
      log.warn(`No subscription item found for ${subscriptionId}`);
      return { applied: false };
    }

    await this.deps.billingProviderService.handleSubscriptionUpdate({
      subscriptionId,
      subscriptionItemId: subscriptionItem.id,
      membershipCount: activeUserCount,
      prorationBehavior: "none",
    });

    log.info(`Updated subscription ${subscriptionId} to ${activeUserCount} active users for team ${team.id}`);
    return { applied: true };
  }
}
