import crypto from "crypto";
import type { Payment, PaymentOption } from "@prisma/client";
import type { CalendarEvent } from "@calcom/types/Calendar";

import prisma from "@calcom/prisma";
import { sendOrganizerPaymentRefundFailedEmail } from "@calcom/emails";

import WaylClient from "./WaylClient";

// Shape stored in Payment.data (JSONB column)
export interface WaylPaymentData {
  paymentUrl: string;       // Wayl hosted page — redirect customer here
  waylReferenceId: string;  // == booking.uid, echoed back in webhook
  waylOrderId: string;      // Wayl's internal order ID (data.id from response)
  webhookSecret: string;    // per-payment secret used to verify webhook signature
}

export class PaymentService {
  private client: WaylClient;
  private credentials: { apiKey: string };

  constructor(credentials: { apiKey: string }) {
    this.credentials = credentials;
    this.client = new WaylClient(credentials.apiKey);
  }

  /**
   * Called by Cal.com when a booking requires payment.
   * Creates a Wayl payment link and stores the URL + webhook secret on Payment.data.
   * Cal.com reads Payment.data.paymentUrl and redirects the customer there.
   */
  async create(
    payment: Payment,
    _tabPayment: { price: number; currency: string },
    _bookerEmail: string,
    _paymentOption: PaymentOption,
    bookingId: number,
    _bookerName: string,
    eventTitle: string,
    _bookingTitle: string
  ): Promise<Payment> {
    const booking = await prisma.booking.findUniqueOrThrow({
      where: { id: bookingId },
      select: { uid: true, title: true },
    });

    const appUrl = process.env.NEXT_PUBLIC_WEBAPP_URL;
    if (!appUrl) {
      throw new Error(
        "[WaylPayment] NEXT_PUBLIC_WEBAPP_URL is not set. Cannot build absolute webhook/redirect URLs."
      );
    }
    const webhookUrl = `${appUrl}/api/integrations/waylpayment/webhook`;
    const redirectionUrl = `${appUrl}/booking/${booking.uid}`;

    // Generate a unique secret for this payment's webhook signature verification.
    // Wayl will sign its webhook request with this secret — we verify it on receipt.
    const webhookSecret = crypto.randomBytes(32).toString("hex");

    const title = eventTitle || booking.title;

    const waylLink = await this.client.createLink({
      referenceId: booking.uid,
      total: payment.amount,       // Cal stores amounts in IQD whole units for this integration
      currency: "IQD",
      lineItem: [
        {
          label: title,
          amount: payment.amount,
          type: "increase",
        },
      ],
      webhookUrl,
      webhookSecret,
      redirectionUrl,
    });

    const data: WaylPaymentData = {
      paymentUrl: waylLink.url,
      waylReferenceId: waylLink.referenceId,
      waylOrderId: waylLink.id,
      webhookSecret,
    };

    const updatedPayment = await prisma.payment.update({
      where: { id: payment.id },
      data: {
        externalId: waylLink.referenceId, // == booking.uid
        data: data as object,
      },
    });

    return updatedPayment;
  }

  /**
   * Called when a booking is cancelled before payment — invalidate the unpaid link.
   */
  async deletePayment(payment: Payment): Promise<boolean> {
    try {
      if (payment.externalId) {
        await this.client.invalidateLinkIfPending(payment.externalId);
      }
      return true;
    } catch (err) {
      console.error("[WaylPayment] deletePayment error:", err);
      return false;
    }
  }

  /**
   * Called when a booking is cancelled after payment — issue a refund.
   */
  async refund(payment: Payment): Promise<Payment> {
    try {
      if (!payment.externalId) throw new Error("No Wayl reference ID on payment record");

      const booking = await prisma.booking.findFirst({
        where: { payment: { some: { id: payment.id } } },
        select: { title: true, uid: true },
      });

      // Wayl requires a minimum 100-character reason
      const reason =
        `Refund requested for Cal.com booking cancellation. ` +
        `Booking: ${booking?.title ?? "N/A"} (UID: ${booking?.uid ?? "N/A"}). ` +
        `Payment reference: ${payment.externalId}. ` +
        `This refund was initiated automatically by Cal.com when the booking was cancelled.`;

      await this.client.createRefund({
        referenceId: payment.externalId,
        reason,
      });

      const updatedPayment = await prisma.payment.update({
        where: { id: payment.id },
        data: { refunded: true },
      });

      return updatedPayment;
    } catch (err) {
      console.error("[WaylPayment] refund error:", err);
      await sendOrganizerPaymentRefundFailedEmail({ payment });
      throw err;
    }
  }

  async afterPayment(
    _event: CalendarEvent,
    _booking: { uid: string },
    _payment: Payment
  ): Promise<void> {
    // Cal.com core handles status transitions and confirmation emails.
  }

  /**
   * Poll Wayl to check if a specific payment was completed.
   * Used as a fallback if the webhook was missed.
   */
  async getPaymentDetails(payment: Payment): Promise<{ isPaid: boolean }> {
    try {
      if (!payment.externalId) return { isPaid: false };
      const link = await this.client.getLinkByReference(payment.externalId);
      return { isPaid: link.status === "Complete" };
    } catch {
      return { isPaid: false };
    }
  }

  isSetupAlready(): boolean {
    return !!this.credentials.apiKey;
  }
}

export default PaymentService;
