import type { Booking, Payment, PaymentOption, Prisma } from "@prisma/client";
import * as MercadoPago from "mercadopago";
import { v4 as uuidv4 } from "uuid";
import z from "zod";

import type { IAbstractPaymentService } from "@calcom/lib/PaymentService";
import prisma from "@calcom/prisma";
import type { CalendarEvent } from "@calcom/types/Calendar";

const mercadoPagoCredentialKeysSchema = z.object({
  access_token: z.string(),
  public_key: z.string(),
});

export class PaymentService implements IAbstractPaymentService {
  private mercadoPago: typeof MercadoPago;
  private credentials: z.infer<typeof mercadoPagoCredentialKeysSchema>;

  constructor(credentials: { key: Prisma.JsonValue }) {
    this.credentials = mercadoPagoCredentialKeysSchema.parse(credentials.key);

    this.mercadoPago = MercadoPago;
  }

  async create(
    payment: Pick<Prisma.PaymentUncheckedCreateInput, "amount" | "currency">,
    bookingId: Booking["id"]
  ) {
    try {
      this.mercadoPago.configure({
        access_token: this.credentials.access_token,
      });

      const booking = await prisma?.booking.findFirst({
        select: {
          uid: true,
          title: true,
        },
        where: {
          id: bookingId,
        },
      });
      if (!booking) {
        throw new Error();
      }
      const { uid: bookingUid, title } = booking;

      const preference = await this.mercadoPago.preferences.create({
        items: [
          {
            title,
            unit_price: payment.amount / 100,
            quantity: 1,
          },
        ],
        back_urls: {
          success: `${process.env.NEXT_PUBLIC_WEBSITE_URL}/booking/${bookingUid}}?payment=success`,
          failure: `${process.env.NEXT_PUBLIC_WEBSITE_URL}/booking/${bookingUid}}?payment=failure`,
          pending: `${process.env.NEXT_PUBLIC_WEBSITE_URL}/booking/${bookingUid}}?payment=pending`,
        },
        auto_return: "approved",
      });
      console.log({ preference });
      const paymentData = await prisma?.payment.create({
        data: {
          uid: uuidv4(),
          app: {
            connect: {
              slug: "mercado_pago",
            },
          },
          booking: {
            connect: {
              id: bookingId,
            },
          },
          amount: payment.amount,
          currency: payment.currency,
          externalId: bookingUid,
          data: Object.assign({}, preference.body, {
            stripe_publishable_key: this.credentials.public_key,
            stripeAccount: this.credentials.access_token,
          }) as unknown as Prisma.InputJsonValue,
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
  async refund(): Promise<Payment> {
    throw new Error("Method not implemented.");
  }

  collectCard(
    payment: Pick<Prisma.PaymentUncheckedCreateInput, "amount" | "currency">,
    bookingId: number,
    bookerEmail: string,
    paymentOption: PaymentOption
  ): Promise<Payment> {
    throw new Error("Method not implemented.");
  }
  chargeCard(
    payment: Pick<Prisma.PaymentUncheckedCreateInput, "amount" | "currency">,
    bookingId: number
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
    event: CalendarEvent,
    booking: {
      user: { email: string | null; name: string | null; timeZone: string } | null;
      id: number;
      startTime: { toISOString: () => string };
      uid: string;
    },
    paymentData: Payment
  ): Promise<void> {
    throw new Error("Method not implemented.");
  }
  deletePayment(paymentId: number): Promise<boolean> {
    throw new Error("Method not implemented.");
  }
}
