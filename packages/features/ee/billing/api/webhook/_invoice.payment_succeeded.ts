import logger from "@calcom/lib/logger";

import { findMonthlyProrationLineItem } from "../../lib/proration-utils";
import { MonthlyProrationService } from "../../service/proration/MonthlyProrationService";
import type { SWHMap } from "./__handler";

const log = logger.getSubLogger({ prefix: ["invoice-payment-succeeded"] });

type Data = SWHMap["invoice.payment_succeeded"]["data"];

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

  await prorationService.handleProrationPaymentSuccess(prorationId);

  log.info(`proration ${prorationId} marked as charged`);

  return { success: true };
};

export default handler;
