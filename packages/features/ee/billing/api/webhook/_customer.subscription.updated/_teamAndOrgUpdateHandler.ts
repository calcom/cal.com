import logger from "@calcom/lib/logger";
import { TeamRepository } from "@calcom/lib/server/repository/team";
import { prisma } from "@calcom/prisma";

import { STRIPE_ORG_PRODUCT_ID } from "../../../lib/constants";
import { HttpCode } from "../../../lib/httpCode";
import type { SWHMap } from "../../../lib/types";
import { BillingRepositoryFactory } from "../../../repository/billingRepositoryFactory";
import { TeamSubscriptionEventHandler } from "../../../service/TeamSubscriptionEventHandler";
import { StripeBillingService } from "../../../stripe-billing-service";

const handler = async (data: SWHMap["customer.subscription.updated"]["data"] & { productId: string }) => {
  const log = logger.getSubLogger({ prefix: ["_teamAndOrgUpdateHandler"] });
  const subscription = data.object;
  const subscriptionItem = subscription.items.data.find((item) => item.price.product === data.productId);

  if (!subscriptionItem) {
    log.error(
      `Subscription item not found for subscription ${subscription.id} and productId ${data.productId}`
    );
    return;
  }

  const isOrganization = data.productId === STRIPE_ORG_PRODUCT_ID;
  console.log("isOrganization", isOrganization);
  const billingRepository = BillingRepositoryFactory.getRepository(isOrganization);
  const teamRepository = new TeamRepository(prisma);
  const teamSubscriptionEventHandler = new TeamSubscriptionEventHandler(billingRepository, teamRepository);

  const status = StripeBillingService.mapSubscriptionStatusToCalStatus({
    stripeStatus: subscription.status,
    subscriptionId: subscription.id,
  });

  const { subscriptionStart, subscriptionTrialEnd, subscriptionEnd } =
    StripeBillingService.extractSubscriptionDates(subscription);

  try {
    await teamSubscriptionEventHandler.handleUpdate({
      subscriptionId: subscription.id,
      subscriptionItemId: subscriptionItem.id,
      customerId: subscription.customer as string,
      status,
      subscriptionStart,
      subscriptionTrialEnd,
      subscriptionEnd,
    });
    return { success: true, subscriptionId: subscription.id, status };
  } catch (error) {
    log.error("Error handling team subscription update:", error);
    throw new HttpCode(202, "Failed to handle team subscription update");
  }
};

export default handler;
