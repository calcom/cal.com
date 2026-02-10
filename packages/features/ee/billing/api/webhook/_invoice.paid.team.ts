import { getSeatBillingStrategyFactory } from "@calcom/features/ee/billing/di/containers/Billing";
import logger from "@calcom/lib/logger";
import { z } from "zod";

import type { SWHMap } from "./__handler";

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

  if (invoice.billing_reason === "subscription_cycle") {
    const periodStart = invoice.lines.data[0]?.period?.start;
    if (!periodStart) {
      log.warn(`Invoice has no period start for subscription ${subscriptionId}, skipping renewal handling`);
      return { success: true };
    }

    log.info(`Processing renewal invoice for team subscription ${subscriptionId}`);
    const factory = getSeatBillingStrategyFactory();
    const strategy = await factory.createBySubscriptionId(subscriptionId);
    await strategy.onRenewalPaid(subscriptionId, new Date(periodStart * 1000));
  }

  return { success: true };
};

export default handler;
