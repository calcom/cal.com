import logger from "@calcom/lib/logger";

import type { HighWaterMarkService } from "../highWaterMark/HighWaterMarkService";
import type { HighWaterMarkRepository } from "../../repository/highWaterMark/HighWaterMarkRepository";
import { BaseSeatBillingStrategy } from "./ISeatBillingStrategy";
import type { SeatChangeContext } from "./ISeatBillingStrategy";

const log = logger.getSubLogger({ prefix: ["HighWaterMarkStrategy"] });

export interface IHighWaterMarkStrategyDeps {
  highWaterMarkRepository: HighWaterMarkRepository;
  highWaterMarkService: HighWaterMarkService;
}

export class HighWaterMarkStrategy extends BaseSeatBillingStrategy {
  constructor(private readonly deps: IHighWaterMarkStrategyDeps) {
    super();
  }

  async onSeatChange(context: SeatChangeContext): Promise<void> {
    if (context.changeType !== "addition") return;

    const billing = await this.deps.highWaterMarkRepository.getByTeamId(context.teamId);
    if (!billing) return;

    const periodStart = billing.highWaterMarkPeriodStart || billing.subscriptionStart;
    if (!periodStart) return;

    const result = await this.deps.highWaterMarkRepository.updateIfHigher({
      teamId: context.teamId,
      isOrganization: billing.isOrganization,
      newSeatCount: context.membershipCount,
      periodStart,
    });

    if (result.updated) {
      log.info(`High water mark updated for team ${context.teamId}`, {
        previousHighWaterMark: result.previousHighWaterMark,
        newHighWaterMark: context.membershipCount,
      });
    }
  }

  override async onInvoiceUpcoming(subscriptionId: string): Promise<{ applied: boolean }> {
    const applied = await this.deps.highWaterMarkService.applyHighWaterMarkToSubscription(subscriptionId);
    return { applied };
  }

  override async onRenewalPaid(subscriptionId: string, periodStart: Date): Promise<{ reset: boolean }> {
    const reset = await this.deps.highWaterMarkService.resetSubscriptionAfterRenewal({
      subscriptionId,
      newPeriodStart: periodStart,
    });
    return { reset };
  }
}
