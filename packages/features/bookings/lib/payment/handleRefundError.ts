import { sendOrganizerPaymentRefundFailedEmail } from "@calcom/emails/billing-email-service";
import logger from "@calcom/lib/logger";
import type { CalendarEvent } from "@calcom/types/Calendar";

const log = logger.getSubLogger({ prefix: ["handleRefundError"] });

const handleRefundError = async (opts: { event: CalendarEvent; reason: string; paymentId: string }) => {
  log.error(`refund failed: ${opts.reason} for booking '${opts.event.uid}'`);
  try {
    await sendOrganizerPaymentRefundFailedEmail({
      ...opts.event,
      paymentInfo: { reason: opts.reason, id: opts.paymentId },
    });
  } catch (e) {
    log.error("Failed to send refund failure email", e);
  }
};

export { handleRefundError };
