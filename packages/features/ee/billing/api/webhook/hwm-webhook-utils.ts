import { getBillingProviderService } from "@calcom/ee/billing/di/containers/Billing";
import { HighWaterMarkService } from "@calcom/features/ee/billing/service/highWaterMark/HighWaterMarkService";
import logger from "@calcom/lib/logger";
import type { Logger } from "tslog";

const defaultLogger = logger.getSubLogger({ prefix: ["hwm-webhook-utils"] });

export function extractPeriodStartFromInvoice(
  linesData: Array<{ period?: { start: number; end: number } }>
): number | undefined {
  if (!linesData || linesData.length === 0) {
    return undefined;
  }
  return linesData[0]?.period?.start;
}

export function validateInvoiceLinesForHwm(
  linesData: Array<{ period?: { start: number; end: number } }>,
  subscriptionId: string,
  log: Logger<unknown> = defaultLogger
): { isValid: boolean; periodStart?: number } {
  if (!linesData || linesData.length === 0) {
    log.warn(
      `Invoice has no line items for subscription ${subscriptionId}, cannot process HWM`
    );
    return { isValid: false };
  }

  const periodStart = linesData[0]?.period?.start;
  if (!periodStart) {
    log.warn(
      `Invoice line item missing period.start for subscription ${subscriptionId}, cannot process HWM`
    );
    return { isValid: false };
  }

  return { isValid: true, periodStart };
}

export interface HwmResetResult {
  success: boolean;
  updated?: boolean;
  error?: string;
}

export async function handleHwmResetAfterRenewal(
  subscriptionId: string,
  periodStartTimestamp: number | undefined,
  log: Logger<unknown> = defaultLogger
): Promise<HwmResetResult> {
  if (!periodStartTimestamp) {
    log.warn(
      `No period start timestamp for subscription ${subscriptionId}, skipping HWM reset`
    );
    return { success: false, error: "No period start timestamp" };
  }

  const newPeriodStart = new Date(periodStartTimestamp * 1000);
  const billingProviderService = getBillingProviderService();
  const highWaterMarkService = new HighWaterMarkService({
    logger: log,
    billingService: billingProviderService,
  });

  try {
    const updated = await highWaterMarkService.resetSubscriptionAfterRenewal({
      subscriptionId,
      newPeriodStart,
    });

    log.info("HWM reset after invoice paid", {
      subscriptionId,
      newPeriodStart,
      updated,
    });

    return { success: true, updated };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log.error("Failed to reset HWM after invoice paid", {
      subscriptionId,
      error: errorMessage,
    });
    return { success: false, error: errorMessage };
  }
}
