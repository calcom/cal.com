import { v4 as uuidv4 } from "uuid";

import prisma from "@calcom/prisma";
import type { Booking, Payment, Prisma, PaymentOption } from "@calcom/prisma/client";
import type { CalendarEvent } from "@calcom/types/Calendar";
import type { IAbstractPaymentService } from "@calcom/types/PaymentService";

import { appKeysSchema } from "../zod";
import { PaystackClient } from "./PaystackClient";

class PaystackPaymentService implements IAbstractPaymentService {
  private client: PaystackClient | null;
  private credentials: { public_key: string; secret_key: string } | null;

  constructor(credentials: { key: Prisma.JsonValue }) {
    const parsed = appKeysSchema.safeParse(credentials.key);
    if (parsed.success) {
      this.credentials = parsed.data;
      this.client = new PaystackClient(parsed.data.secret_key);
    } else {
      this.credentials = null;
      this.client = null;
    }
  }

  async create(
    payment: Pick<Prisma.PaymentUncheckedCreateInput, "amount" | "currency">,
    bookingId: Booking["id"],
    _userId: Booking["userId"],
    _username: string | null,
    _bookerName: string | null,
    _paymentOption: PaymentOption,
    bookerEmail: string,
    _bookerPhoneNumber?: string | null,
    eventTitle?: string,
    _bookingTitle?: string
  ): Promise<Payment> {
    const booking = await prisma.booking.findUnique({
      select: { uid: true, title: true },
      where: { id: bookingId },
    });

    if (!booking) {
      throw new Error("Booking not found");
    }

    if (!this.client || !this.credentials) {
      throw new Error("Paystack credentials not configured");
    }

    const uid = uuidv4();
    const reference = `cal_${bookingId}_${uid.slice(0, 8)}`;

    const paystackResponse = await this.client.initializeTransaction({
      email: bookerEmail,
      amount: payment.amount,
      currency: payment.currency.toUpperCase(),
      reference,
      callback_url: `${process.env.NEXT_PUBLIC_WEBAPP_URL}/api/integrations/paystack/verify`,
      metadata: {
        bookingId,
        eventTitle: eventTitle || booking.title,
      },
    });

    const paymentData = await prisma.payment.create({
      data: {
        uid,
        app: {
          connect: {
            slug: "paystack",
          },
        },
        booking: {
          connect: {
            id: bookingId,
          },
        },
        amount: payment.amount,
        externalId: reference,
        currency: payment.currency,
        data: {
          access_code: paystackResponse.access_code,
          authorization_url: paystackResponse.authorization_url,
          publicKey: this.credentials.public_key,
          reference,
        } as unknown as Prisma.InputJsonValue,
        fee: 0,
        refunded: false,
        success: false,
        paymentOption: "ON_BOOKING",
      },
    });

    return paymentData;
  }

  async collectCard(
    _payment: Pick<Prisma.PaymentUncheckedCreateInput, "amount" | "currency">,
    _bookingId: Booking["id"],
    _paymentOption: PaymentOption,
    _bookerEmail: string,
    _bookerPhoneNumber?: string | null
  ): Promise<Payment> {
    throw new Error("Paystack does not support card hold. Only ON_BOOKING payment is available.");
  }

  async chargeCard(
    _payment: Pick<Prisma.PaymentUncheckedCreateInput, "amount" | "currency">,
    _bookingId?: Booking["id"]
  ): Promise<Payment> {
    throw new Error("Paystack does not support card hold. Only ON_BOOKING payment is available.");
  }

  async update(
    paymentId: Payment["id"],
    data: Partial<Prisma.PaymentUncheckedCreateInput>
  ): Promise<Payment> {
    return await prisma.payment.update({
      where: { id: paymentId },
      data,
    });
  }

  async refund(paymentId: Payment["id"]): Promise<Payment | null> {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      select: {
        id: true,
        success: true,
        refunded: true,
        externalId: true,
      },
    });

    if (!payment) {
      return null;
    }

    if (payment.refunded) {
      return await prisma.payment.findUnique({ where: { id: paymentId } });
    }

    if (!payment.success) {
      return await prisma.payment.findUnique({ where: { id: paymentId } });
    }

    if (!this.client) {
      throw new Error("Paystack credentials not configured");
    }

    await this.client.createRefund({
      transaction: payment.externalId,
    });

    return await prisma.payment.update({
      where: { id: paymentId },
      data: { refunded: true },
    });
  }

  async getPaymentPaidStatus(): Promise<string> {
    return "paid";
  }

  async getPaymentDetails(): Promise<Payment> {
    throw new Error("Method not implemented.");
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
    // No post-payment actions needed for Paystack
    return Promise.resolve();
  }

  async deletePayment(paymentId: Payment["id"]): Promise<boolean> {
    try {
      await prisma.payment.delete({
        where: { id: paymentId },
      });
      return true;
    } catch {
      return false;
    }
  }

  isSetupAlready(): boolean {
    return !!(this.credentials?.public_key && this.credentials?.secret_key);
  }
}

/**
 * Factory function that creates a Paystack Payment service instance.
 * Exported instead of the class to prevent internal types from leaking
 * into the emitted .d.ts file.
 */
export function BuildPaymentService(credentials: { key: Prisma.JsonValue }): IAbstractPaymentService {
  return new PaystackPaymentService(credentials);
}
