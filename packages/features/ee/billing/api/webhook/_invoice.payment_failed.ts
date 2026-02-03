import { getBillingProviderService } from "@calcom/ee/billing/di/containers/Billing";
import logger from "@calcom/lib/logger";

import { findMonthlyProrationLineItem } from "../../lib/proration-utils";
import { MonthlyProrationService } from "../../service/proration/MonthlyProrationService";
import type { SWHMap } from "./__handler";

const log = logger.getSubLogger({ prefix: ["invoice-payment-failed"] });

type Data = SWHMap["invoice.payment_failed"]["data"];

const handler = async (data: Data) => {
  const invoice = data.object;

  const prorationLineItem = findMonthlyProrationLineItem(invoice.lines.data);

  if (!prorationLineItem) {
    return { success: true, message: "no proration line items in invoice" };
  }

  const prorationId = prorationLineItem.metadata?.prorationId;
  if (!prorationId) {
    log.warn("proration line item missing prorationId metadata");
    return { success: false, message: "missing prorationId in metadata" };
  }

  const prorationService = new MonthlyProrationService();
  let failureReason = invoice.status ?? "payment_failed";
  const paymentIntentId =
    typeof invoice.payment_intent === "string" ? invoice.payment_intent : invoice.payment_intent?.id;

  if (paymentIntentId) {
    const billingProviderService = getBillingProviderService();
    const paymentFailureReason = await billingProviderService.getPaymentIntentFailureReason(paymentIntentId);
    failureReason = paymentFailureReason ?? failureReason;
  }

  await prorationService.handleProrationPaymentFailure({
    prorationId,
    reason: failureReason,
  });

  log.info(`proration ${prorationId} marked as failed`);

  return { success: true };
};

export default handler;
