import type { Booking, Payment, PaymentOption, Prisma } from "@prisma/client";
import { v4 as uuidv4 } from "uuid";

import MercadoPago from "@calcom/app-store/mercadopago/lib/MercadoPago";
import { mercadoPagoCredentialSchema } from "@calcom/app-store/mercadopago/lib/mercadoPagoCredentialSchema";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { getErrorFromUnknown } from "@calcom/lib/errors";
import prisma from "@calcom/prisma";
import type { CalendarEvent } from "@calcom/types/Calendar";
import type { IAbstractPaymentService } from "@calcom/types/PaymentService";

import { paymentOptionEnum } from "../zod";

export class PaymentService implements IAbstractPaymentService {
  private mercadoPago: MercadoPago;

  constructor(credentials: { id: number; key: Prisma.JsonValue }) {
    const parse = mercadoPagoCredentialSchema.safeParse(credentials.key);
    if (!parse.success) {
      throw new Error("Invalid `credentials`");
    }

    this.mercadoPago = new MercadoPago({
      clientId: process.env.MERCADOPAGO_CLIENT_ID || "",
      clientSecret: process.env.MERCADOPAGO_CLIENT_SECRET || "",
      userCredentials: {
        id: credentials.id,
        key: parse.data,
      },
    });
  }

  private async getPayment(where: Prisma.PaymentWhereInput) {
    const payment = await prisma.payment.findFirst({ where });
    if (!payment) throw new Error("Payment not found");
    if (!payment.externalId) throw new Error("Payment externalId not found");
    if (!payment.data) throw new Error("Payment `data` not set");
    return {
      ...payment,
      externalId: payment.externalId,
      mercadoPagoPaymentId: (payment.data as { paymentId: string }).paymentId,
    };
  }

  async create(
    payment: Pick<Prisma.PaymentUncheckedCreateInput, "amount" | "currency">,
    bookingId: Booking["id"],
    bookerEmail: string,
    paymentOption: PaymentOption,
    eventTitle?: string
  ) {
    try {
      // Ensure that the payment service can support the passed payment option
      if (paymentOptionEnum.parse(paymentOption) !== "ON_BOOKING") {
        throw new Error("Payment option is not compatible with create method");
      }

      const booking = await prisma.booking.findFirst({
        select: {
          uid: true,
          title: true,
          eventTypeId: true,
        },
        where: {
          id: bookingId,
        },
      });

      if (!booking) {
        throw new Error("Booking not found");
      }
      if (!booking.eventTypeId) {
        throw new Error("Booking not related to an EventType");
      }

      const paymentUid = uuidv4();

      const preferenceResult = await this.mercadoPago.createPreference({
        amount: payment.amount / 100,
        currency: payment.currency,
        paymentUid,
        bookingId,
        eventTypeId: booking.eventTypeId,
        bookerEmail,
        eventName: eventTitle || "",
        notificationUrl: `${WEBAPP_URL}/api/integrations/mercadopago/webhook?external_reference=${paymentUid}`,
        returnUrl: `${WEBAPP_URL}/booking/${booking.uid}?mercadoPagoPaymentStatus=success`,
        cancelUrl: `${WEBAPP_URL}/payment/${paymentUid}`,
      });

      const paymentData = await prisma.payment.create({
        data: {
          uid: paymentUid,
          app: {
            connect: {
              slug: "mercadopago",
            },
          },
          booking: {
            connect: {
              id: bookingId,
            },
          },
          amount: payment.amount,
          externalId: preferenceResult.id,
          currency: payment.currency,
          data: Object.assign({}, { preference: preferenceResult }) as unknown as Prisma.InputJsonValue,
          fee: 0,
          refunded: false,
          success: false,
          paymentOption: paymentOption || "ON_BOOKING",
        },
      });

      if (!paymentData) {
        throw new Error();
      }
      return paymentData;
    } catch (error) {
      console.error(error);
      throw new Error("Payment could not be created");
    }
  }

  async update(): Promise<Payment> {
    throw new Error("Method not implemented.");
  }

  async refund(paymentId: Payment["id"]): Promise<Payment> {
    try {
      const payment = await this.getPayment({
        id: paymentId,
        success: true,
        refunded: false,
      });

      const refund = await this.mercadoPago.refundPayment(payment.mercadoPagoPaymentId);

      if (refund.status === "cancelled" || refund.status === "rejected") {
        throw new Error("Refund failed");
      }

      const updatedPayment = await prisma.payment.update({
        where: {
          id: payment.id,
        },
        data: {
          refunded: true,
        },
      });
      return updatedPayment;
    } catch (e) {
      const err = getErrorFromUnknown(e);
      throw err;
    }
  }

  async collectCard(
    _payment: Pick<Prisma.PaymentUncheckedCreateInput, "amount" | "currency">,
    _bookingId: number,
    _bookerEmail: string,
    _paymentOption: PaymentOption
  ): Promise<Payment> {
    throw new Error("Method not implemented.");
  }

  chargeCard(
    _payment: Pick<Prisma.PaymentUncheckedCreateInput, "amount" | "currency">,
    _bookingId: number
  ): Promise<Payment> {
    throw new Error("Method not implemented.");
  }

  getPaymentPaidStatus(): Promise<string> {
    throw new Error("Method not implemented.");
  }

  getPaymentDetails(): Promise<Payment> {
    throw new Error("Method not implemented.");
  }

  afterPayment(
    _event: CalendarEvent,
    _booking: {
      user: { email: string | null; name: string | null; timeZone: string } | null;
      id: number;
      startTime: { toISOString: () => string };
      uid: string;
    },
    _paymentData: Payment
  ): Promise<void> {
    return Promise.resolve();
  }

  deletePayment(_paymentId: number): Promise<boolean> {
    return Promise.resolve(false);
  }
}
