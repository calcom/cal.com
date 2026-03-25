import {
  getBillingProviderService,
  getSeatBillingStrategyFactory,
} from "@calcom/ee/billing/di/containers/Billing";
import logger from "@calcom/lib/logger";

import type { SWHMap } from "./__handler";

const log = logger.getSubLogger({ prefix: ["invoice-payment-failed"] });

type Data = SWHMap["invoice.payment_failed"]["data"];

const handler = async (data: Data) => {
  const invoice = data.object;

  const subscriptionId =
    typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription?.id;

  if (!subscriptionId) {
    log.debug("Not a subscription invoice, skipping");
    return { success: true, message: "not a subscription invoice" };
  }

  let failureReason = invoice.status ?? "payment_failed";
  const paymentIntentId =
    typeof invoice.payment_intent === "string" ? invoice.payment_intent : invoice.payment_intent?.id;

  if (paymentIntentId) {
    const billingProviderService = getBillingProviderService();
    const paymentFailureReason = await billingProviderService.getPaymentIntentFailureReason(paymentIntentId);
    failureReason = paymentFailureReason ?? failureReason;
  }

  const factory = getSeatBillingStrategyFactory();
  const strategy = await factory.createBySubscriptionId(subscriptionId);
  const { handled } = await strategy.onPaymentFailed({ lines: invoice.lines }, failureReason);

  if (handled) {
    log.info("Strategy handled payment failure", { subscriptionId, failureReason });
  }

  return { success: true, handled };
};

export default handler;
