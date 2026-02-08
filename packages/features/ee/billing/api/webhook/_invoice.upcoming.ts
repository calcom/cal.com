import { getBillingProviderService } from "@calcom/features/ee/billing/di/containers/Billing";
import { HighWaterMarkService } from "@calcom/features/ee/billing/service/highWaterMark/HighWaterMarkService";
import logger from "@calcom/lib/logger";

import type { SWHMap } from "./__handler";

type Data = SWHMap["invoice.upcoming"]["data"];

const log = logger.getSubLogger({ prefix: ["stripe-webhook-invoice-upcoming"] });

const handler = async (data: Data) => {
  const invoice = data.object;

  // Only handle subscription invoices
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

  const billingService = getBillingProviderService();
  const highWaterMarkService = new HighWaterMarkService({
    logger: log,
    billingService,
  });

  try {
    const applied = await highWaterMarkService.applyHighWaterMarkToSubscription(subscriptionId);

    if (applied) {
      log.info("Successfully applied high water mark before renewal", {
        subscriptionId,
      });
      return { success: true, highWaterMarkApplied: true };
    }

    log.debug("No high water mark update needed", { subscriptionId });
    return { success: true, highWaterMarkApplied: false };
  } catch (error) {
    log.error("Failed to apply high water mark", {
      subscriptionId,
      error,
    });
    // Return success: false but don't throw - we don't want to fail the webhook
    return { success: false, error: String(error) };
  }
};

export default handler;
