import type { StripeBillingService } from "@calcom/features/ee/billing/service/billingProvider/StripeBillingService";

export const hasScheduledCancellation = (
  subscription: Awaited<ReturnType<StripeBillingService["getSubscription"]>>
): boolean => {
  return Boolean(subscription?.cancel_at_period_end || subscription?.cancel_at);
};
