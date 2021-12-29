import { Payment, Credential } from "@prisma/client";

import { sendOrganizerPaymentRefundFailedEmail } from "@lib/emails/email-manager";
import { getErrorFromUnknown } from "@lib/errors";
import { CalendarEvent } from "@lib/integrations/calendar/interfaces/Calendar";
import { DEFAULT_PAYMENT_METHOD_INTEGRATION_NAME } from "@lib/integrations/payment/constants/defaults";
import {
  BookingDetail,
  BookingRefundDetail,
  bookingRefundError,
  PaymentMethod,
  PaymentMethodCredential,
  PaymentSelectedEventType,
} from "@lib/integrations/payment/interfaces/PaymentMethod";
import logger from "@lib/logger";

export default abstract class BasePaymentService implements PaymentMethod {
  protected integrationName = DEFAULT_PAYMENT_METHOD_INTEGRATION_NAME;

  log = logger.getChildLogger({ prefix: [`[[lib] ${this.integrationName}`] });

  constructor(_credential: Credential, integrationName: string) {
    this.integrationName = integrationName;
  }

  handlePayment(
    event: CalendarEvent,
    selectedEventType: PaymentSelectedEventType,
    _credential: PaymentMethodCredential,
    booking: BookingDetail
  ): Promise<Payment> {
    this.log.info(
      `handle payment for ${JSON.stringify(event)}, payment ${JSON.stringify(
        selectedEventType
      )} and booking ${JSON.stringify(booking)}`
    );

    throw new Error("Method not implemented.");
  }

  async refund(booking: BookingRefundDetail, event: CalendarEvent): Promise<void> {
    try {
      const payment = booking.payment.find((e) => e.success && !e.refunded);
      if (!payment) return new Promise((resolve) => resolve());

      await this.handleRefundError({
        event: event,
        reason: "cannot refund non Stripe payment",
        paymentId: "unknown",
      });
    } catch (e) {
      const err = getErrorFromUnknown(e);
      console.error(err, "Refund failed");
      await this.handleRefundError({
        event: event,
        reason: err.message || "unknown",
        paymentId: "unknown",
      });
    }
  }

  async handleRefundError(opts: bookingRefundError): Promise<void> {
    console.error(`refund failed: ${opts.reason} for booking '${opts.event.uid}'`);

    await sendOrganizerPaymentRefundFailedEmail({
      ...opts.event,
      paymentInfo: { reason: opts.reason, id: opts.paymentId },
    });
  }
}
