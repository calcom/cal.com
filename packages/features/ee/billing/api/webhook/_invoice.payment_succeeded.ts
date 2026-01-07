import logger from "@calcom/lib/logger";
import { MonthlyProrationService } from "../../service/proration/MonthlyProrationService";
import type { SWHMap } from "./__handler";

const log = logger.getSubLogger({ prefix: ["invoice-payment-succeeded"] });

const handler = async (data: SWHMap["invoice.payment_succeeded"]["data"]) => {
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

  const prorationService = new MonthlyProrationService();

  await prorationService.handleProrationPaymentSuccess(prorationId);

  log.info(`proration ${prorationId} marked as charged`);

  return { success: true };
};

export default handler;
