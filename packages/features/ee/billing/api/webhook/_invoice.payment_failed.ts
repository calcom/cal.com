import logger from "@calcom/lib/logger";

import type { SWHMap } from "./__handler";

const log = logger.getSubLogger({ prefix: ["invoice-payment-failed"] });

const handler = async (data: SWHMap["invoice.payment_failed"]["data"]) => {
  const invoice = data.object;

  const prorationLineItem = invoice.lines.data.find((line) => line.metadata?.type === "monthly_proration");

  if (!prorationLineItem) {
    return { success: true, message: "no proration line items in invoice" };
  }

  const prorationId = prorationLineItem.metadata.prorationId;
  if (!prorationId) {
    log.warn("proration line item missing prorationId metadata");
    return { success: false, message: "missing prorationId in metadata" };
  }

  const failureReason = invoice.last_finalization_error?.message || "payment failed";

  const { MonthlyProrationService } = await import("../../service/proration/MonthlyProrationService");
  const prorationService = new MonthlyProrationService();

  await prorationService.handleProrationPaymentFailure({ prorationId, reason: failureReason });

  log.warn(`proration ${prorationId} payment failed: ${failureReason}`);

  return { success: true };
};

export default handler;
