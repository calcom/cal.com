import type { Booking, Payment, PaymentOption, Prisma } from "@prisma/client";
import { v4 as uuidv4 } from "uuid";

import MercadoPago from "@calcom/app-store/mercadopago/lib/MercadoPago";
import { mercadoPagoCredentialSchema } from "@calcom/app-store/mercadopago/lib/mercadoPagoCredentialSchema";
import prisma from "@calcom/prisma";
import type { CalendarEvent } from "@calcom/types/Calendar";
import type { IAbstractPaymentService } from "@calcom/types/PaymentService";

import { paymentOptionEnum } from "../zod";

export class PaymentService implements IAbstractPaymentService {
  private mercadoPago: MercadoPago;

  constructor(credentials: { id: number; key: Prisma.JsonValue }) {
    this.mercadoPago = new MercadoPago({
      clientId: process.env.MERCADOPAGO_CLIENT_ID || "",
      clientSecret: process.env.MERCADOPAGO_CLIENT_SECRET || "",
      userCredentials: {
        id: credentials.id,
        key: mercadoPagoCredentialSchema.parse(credentials.key),
      },
    });
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

      const uid = uuidv4();

      const orderResult = await this.mercadoPago.createPreference({
        amount: payment.amount,
        currency: payment.currency,
        paymentUid: uid,
        bookingId,
        eventTypeId: booking.eventTypeId,
        bookerEmail,
        eventName: eventTitle || "",
      });

      const paymentData = await prisma.payment.create({
        data: {
          uid,
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
          externalId: orderResult.id,
          currency: payment.currency,
          data: Object.assign({}, { order: orderResult }) as unknown as Prisma.InputJsonValue,
          fee: 0,
          refunded: false,
          success: false,
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
  async refund(_paymentId: Payment["id"]): Promise<Payment> {
    throw new Error("Method not implemented.");
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
