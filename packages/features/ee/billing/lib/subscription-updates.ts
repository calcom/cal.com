import type { Logger } from "tslog";

import type { IBillingProviderService } from "../service/billingProvider/IBillingProviderService";

type ProrationBehavior = "none" | "create_prorations" | "always_invoice";

export async function updateSubscriptionQuantity(params: {
  billingService: IBillingProviderService;
  subscriptionId: string;
  subscriptionItemId: string;
  quantity: number;
  prorationBehavior?: ProrationBehavior;
  logger?: Logger<unknown>;
}): Promise<void> {
  const { billingService, subscriptionId, subscriptionItemId, quantity, prorationBehavior, logger } = params;

  try {
    await billingService.handleSubscriptionUpdate({
      subscriptionId,
      subscriptionItemId,
      membershipCount: quantity,
      ...(prorationBehavior ? { prorationBehavior } : {}),
    });
  } catch (error) {
    if (logger) {
      logger.error(`Failed to update subscription ${subscriptionId} quantity to ${quantity}:`, error);
    }
    throw error;
  }
}
