import { sendOrganizerPaymentRefundFailedEmail } from "@calcom/emails/billing-email-service";
import logger from "@calcom/lib/logger";
import type { CalendarEvent } from "@calcom/types/Calendar";

const handleRefundError = async (opts: { event: CalendarEvent; reason: string; paymentId: string }) => {
  logger.error(`refund failed: ${opts.reason} for booking '${opts.event.uid}'`);
  try {
    await sendOrganizerPaymentRefundFailedEmail({
      ...opts.event,
      paymentInfo: { reason: opts.reason, id: opts.paymentId },
    });
  } catch (e) {
    logger.error(e);
  }
};

export { handleRefundError };
