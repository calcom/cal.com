import { StripeService } from "@/modules/stripe/stripe.service";
import { Injectable, Logger } from "@nestjs/common";

import type { IBillingProviderService } from "@calcom/platform-libraries/organizations";

@Injectable()
export class StripeBillingProviderService implements Pick<IBillingProviderService, "createSubscriptionUsageRecord"> {
  private readonly logger = new Logger(StripeBillingProviderService.name);

  constructor(private readonly stripeService: StripeService) {}

  async createSubscriptionUsageRecord(args: {
    subscriptionId: string;
    action: "increment" | "set";
    quantity: number;
  }): Promise<void> {
    const { subscriptionId, action, quantity } = args;
    const stripe = this.stripeService.getStripe();

    const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId);
    if (!stripeSubscription?.id) {
      this.logger.error(`Failed to retrieve stripe subscription (${subscriptionId})`);
      return;
    }

    const meteredItem = stripeSubscription.items.data.find(
      (item) => item.price?.recurring?.usage_type === "metered"
    );

    if (!meteredItem) {
      this.logger.error(`Stripe subscription (${stripeSubscription.id}) is not usage based`);
      return;
    }

    await stripe.subscriptionItems.createUsageRecord(meteredItem.id, {
      action,
      quantity,
      timestamp: "now",
    });
  }
}
