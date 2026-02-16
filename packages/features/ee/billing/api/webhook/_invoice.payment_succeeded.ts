import { getSeatBillingStrategyFactory } from "@calcom/features/ee/billing/di/containers/Billing";
import logger from "@calcom/lib/logger";

import type { SWHMap } from "./__handler";

const log = logger.getSubLogger({ prefix: ["invoice-payment-succeeded"] });

type Data = SWHMap["invoice.payment_succeeded"]["data"];

const handler = async (data: Data) => {
  const invoice = data.object;

  const subscriptionId =
    typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription?.id;

  if (!subscriptionId) {
    log.debug("Not a subscription invoice, skipping");
    return { success: true, message: "not a subscription invoice" };
  }

  const factory = getSeatBillingStrategyFactory();
  const strategy = await factory.createBySubscriptionId(subscriptionId);
  const { handled } = await strategy.onPaymentSucceeded({ lines: invoice.lines });

  if (handled) {
    log.info("Strategy handled payment succeeded", { subscriptionId });
  }

  return { success: true, handled };
};

export default handler;
