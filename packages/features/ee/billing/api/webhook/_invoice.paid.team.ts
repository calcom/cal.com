import logger from "@calcom/lib/logger";
import { z } from "zod";
import type { SWHMap } from "./__handler";
import { handleHwmResetAfterRenewal, validateInvoiceLinesForHwm } from "./hwm-webhook-utils";

const log = logger.getSubLogger({ prefix: ["invoice-paid-team"] });

const invoicePaidSchema = z.object({
  object: z.object({
    customer: z.string(),
    subscription: z.string(),
    billing_reason: z.string().nullable(),
    lines: z.object({
      data: z.array(
        z.object({
          subscription_item: z.string(),
          period: z
            .object({
              start: z.number(),
              end: z.number(),
            })
            .optional(),
        })
      ),
    }),
  }),
});

const handler = async (data: SWHMap["invoice.paid"]["data"]) => {
  const { object: invoice } = invoicePaidSchema.parse(data);
  const subscriptionId = invoice.subscription;

  log.debug(`Processing invoice paid webhook for team subscription ${subscriptionId}`, {
    billingReason: invoice.billing_reason,
    customerId: invoice.customer,
  });

  // Only handle renewal invoices for HWM reset
  if (invoice.billing_reason === "subscription_cycle") {
    log.info(`Processing renewal invoice for team subscription ${subscriptionId}`);
    const validation = validateInvoiceLinesForHwm(invoice.lines.data, subscriptionId, log);
    if (validation.isValid) {
      await handleHwmResetAfterRenewal(subscriptionId, validation.periodStart, log);
    }
  }

  return { success: true };
};

export default handler;
