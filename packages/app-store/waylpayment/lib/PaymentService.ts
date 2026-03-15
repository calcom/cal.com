import crypto from "node:crypto";
import { v4 as uuidv4 } from "uuid";

import type { Booking, Payment, PaymentOption, Prisma } from "@calcom/prisma/client";
import type { CalendarEvent } from "@calcom/types/Calendar";
import type { IAbstractPaymentService } from "@calcom/types/PaymentService";

import prisma from "@calcom/prisma";

import WaylClient from "./WaylClient";

// Shape stored in Payment.data (JSONB column)
export interface WaylPaymentData {
  paymentUrl: string;       // Wayl hosted page — redirect customer here
  waylReferenceId: string;  // == booking.uid, echoed back in webhook
  waylOrderId: string;      // Wayl's internal order ID (data.id from response)
  webhookSecret: string;    // per-payment secret used to verify webhook signature
}

const waylCredentialSchema = {
  parse(key: unknown): { apiKey: string } | null {
    if (key && typeof key === "object" && "apiKey" in key && typeof (key as Record<string, unknown>).apiKey === "string") {
      return { apiKey: (key as Record<string, unknown>).apiKey as string };
    }
    return null;
  },
};

class WaylPaymentService implements IAbstractPaymentService {
  private client: WaylClient | null = null;
  private credentials: { apiKey: string } | null;

  constructor(credentials: { key: Prisma.JsonValue }) {
    this.credentials = waylCredentialSchema.parse(credentials.key);
    if (this.credentials) {
      this.client = new WaylClient(this.credentials.apiKey);
    }
  }

  async create(
    payment: Pick<Prisma.PaymentUncheckedCreateInput, "amount" | "currency">,
    bookingId: Booking["id"],
    _userId: Booking["userId"],
    _username: string | null,
    _bookerName: string | null,
    paymentOption: PaymentOption,
    _bookerEmail: string,
    _bookerPhoneNumber?: string | null,
    eventTitle?: string,
    _bookingTitle?: string
  ): Promise<Payment> {
    if (!this.credentials || !this.client) {
      throw new Error("[WaylPayment] API key not configured. Please complete app setup.");
    }

    const booking = await prisma.booking.findUniqueOrThrow({
      where: { id: bookingId },
      select: { uid: true, title: true },
    });

    const appUrl = process.env.NEXT_PUBLIC_WEBAPP_URL;
    if (!appUrl) {
      throw new Error("[WaylPayment] NEXT_PUBLIC_WEBAPP_URL is not set.");
    }

    const webhookUrl = `${appUrl}/api/integrations/waylpayment/webhook`;
    const redirectionUrl = `${appUrl}/booking/${booking.uid}`;

    // Per-payment secret for webhook signature verification
    const webhookSecret = crypto.randomBytes(32).toString("hex");

    const title = eventTitle || booking.title;

    const waylLink = await this.client.createLink({
      referenceId: booking.uid,
      total: payment.amount,
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

    const paymentData = await prisma.payment.create({
      data: {
        uid: uuidv4(),
        app: { connect: { slug: "waylpayment" } },
        booking: { connect: { id: bookingId } },
        amount: payment.amount,
        currency: "IQD",
        externalId: waylLink.referenceId,
        data: data as unknown as Prisma.InputJsonValue,
        fee: 0,
        refunded: false,
        success: false,
        paymentOption: paymentOption || "ON_BOOKING",
      },
    });

    return paymentData;
  }

  async collectCard(
    _payment: Pick<Prisma.PaymentUncheckedCreateInput, "amount" | "currency">,
    _bookingId: number,
    _paymentOption: PaymentOption,
    _bookerEmail: string,
    _bookerPhoneNumber?: string | null
  ): Promise<Payment> {
    throw new Error("Method not implemented.");
  }

  async chargeCard(
    _payment: Pick<Prisma.PaymentUncheckedCreateInput, "amount" | "currency">,
    _bookingId?: number
  ): Promise<Payment> {
    throw new Error("Method not implemented.");
  }

  async update(_paymentId: Payment["id"], _data: Partial<Prisma.PaymentUncheckedCreateInput>): Promise<Payment> {
    throw new Error("Method not implemented.");
  }

  /**
   * Called when a booking is cancelled after payment — issue a refund.
   */
  async refund(paymentId: Payment["id"]): Promise<Payment | null> {
    const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) return null;
    if (!this.client) throw new Error("[WaylPayment] API key not configured.");

    if (!payment.externalId) throw new Error("No Wayl reference ID on payment record");

    const booking = await prisma.booking.findFirst({
      where: { payment: { some: { id: paymentId } } },
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

    return prisma.payment.update({
      where: { id: paymentId },
      data: { refunded: true },
    });
  }

  /**
   * Called when a booking is cancelled before payment — invalidate the unpaid link.
   */
  async deletePayment(paymentId: Payment["id"]): Promise<boolean> {
    try {
      const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
      if (payment?.externalId && this.client) {
        await this.client.invalidateLinkIfPending(payment.externalId);
      }
      return true;
    } catch (err) {
      console.error("[WaylPayment] deletePayment error:", err);
      return false;
    }
  }

  async afterPayment(
    _event: CalendarEvent,
    _booking: {
      user: { email: string | null; name: string | null; timeZone: string } | null;
      id: number;
      startTime: { toISOString: () => string };
      uid: string;
    },
    _paymentData: Payment
  ): Promise<void> {
    // Cal.com core handles status transitions and confirmation emails.
  }

  getPaymentPaidStatus(): Promise<string> {
    throw new Error("Method not implemented.");
  }

  getPaymentDetails(): Promise<Payment> {
    throw new Error("Method not implemented.");
  }

  isSetupAlready(): boolean {
    return !!this.credentials?.apiKey;
  }
}

/**
 * Factory function required by handlePayment.ts to detect and instantiate the service.
 */
export function BuildPaymentService(credentials: { key: Prisma.JsonValue }): IAbstractPaymentService {
  return new WaylPaymentService(credentials);
}

export default WaylPaymentService;
