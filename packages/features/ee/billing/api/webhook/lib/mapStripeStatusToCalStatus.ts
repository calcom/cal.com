import logger from "@calcom/lib/logger";

import { SubscriptionStatus } from "../../../repository/IBillingRepository";

export const mapStripeStatusToCalStatus = ({
  stripeStatus,
  subscriptionId,
}: {
  stripeStatus: string;
  subscriptionId: string;
}) => {
  const log = logger.getSubLogger({ prefix: ["mapStripeStatusToCalStatus"] });
  const statusMap: Record<string, SubscriptionStatus> = {
    active: SubscriptionStatus.ACTIVE,
    past_due: SubscriptionStatus.PAST_DUE,
    canceled: SubscriptionStatus.CANCELLED,
    cancelled: SubscriptionStatus.CANCELLED,
    trialing: SubscriptionStatus.TRIALING,
    incomplete: SubscriptionStatus.INCOMPLETE,
    incomplete_expired: SubscriptionStatus.INCOMPLETE_EXPIRED,
    unpaid: SubscriptionStatus.UNPAID,
    paused: SubscriptionStatus.PAUSED,
  };

  const status = statusMap[stripeStatus];
  if (!status) {
    log.warn(`Unhandled status for ${stripeStatus} and sub id ${subscriptionId}`);
  }

  return status || SubscriptionStatus.ACTIVE;
};
