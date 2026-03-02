import { getSeatBillingStrategyFactory } from "@calcom/features/ee/billing/di/containers/Billing";
import logger from "@calcom/lib/logger";
import type { SWHMap } from "./__handler";

type Data = SWHMap["invoice.upcoming"]["data"];

const log = logger.getSubLogger({ prefix: ["stripe-webhook-invoice-upcoming"] });

const handler = async (data: Data) => {
  const invoice = data.object;

  if (!invoice.subscription) {
    log.debug("Not a subscription invoice, skipping");
    return { success: false, message: "Not a subscription invoice" };
  }

  const subscriptionId =
    typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription.id;

  log.info("Processing invoice.upcoming webhook", {
    invoiceId: invoice.id,
    subscriptionId,
    customerId: typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id,
  });

  try {
    const factory = getSeatBillingStrategyFactory();
    const strategy = await factory.createBySubscriptionId(subscriptionId);
    const { applied } = await strategy.onInvoiceUpcoming(subscriptionId);

    log.info("invoice.upcoming handled", {
      subscriptionId,
      strategy: strategy.strategyName,
      applied,
    });

    return { success: true, strategyApplied: applied };
  } catch (error) {
    log.error("Failed to process invoice.upcoming", { subscriptionId, error });
    return { success: false, error: String(error) };
  }
};

export default handler;
