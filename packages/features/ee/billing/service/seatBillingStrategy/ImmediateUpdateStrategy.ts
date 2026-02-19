import type { IBillingProviderService } from "../billingProvider/IBillingProviderService";
import { BaseSeatBillingStrategy } from "./ISeatBillingStrategy";
import type { SeatChangeContext } from "./ISeatBillingStrategy";

export class ImmediateUpdateStrategy extends BaseSeatBillingStrategy {
  constructor(private readonly billingProviderService: IBillingProviderService) {
    super();
  }

  async onSeatChange(context: SeatChangeContext): Promise<void> {
    await this.billingProviderService.handleSubscriptionUpdate({
      subscriptionId: context.subscriptionId,
      subscriptionItemId: context.subscriptionItemId,
      membershipCount: context.membershipCount,
    });
  }
}
