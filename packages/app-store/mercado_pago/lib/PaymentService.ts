import type { Booking, Payment, PaymentOption, Prisma } from "@prisma/client";
import * as MercadoPago from "mercadopago";
import { v4 as uuidv4 } from "uuid";
import z from "zod";

import type { IAbstractPaymentService } from "@calcom/lib/PaymentService";
import prisma from "@calcom/prisma";
import type { CalendarEvent } from "@calcom/types/Calendar";

export const mercadoPagoCredentialKeysSchema = z.object({
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
      const { title } = booking;

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
          externalId: "",
          data: {},
          fee: 0,
          refunded: false,
          success: false,
        },
      });

      const preference = await this.mercadoPago.preferences.create({
        items: [
          {
            title,
            unit_price: payment.amount / 100,
            quantity: 1,
          },
        ],
        back_urls: {
          success: `${process.env.NEXT_PUBLIC_WEBAPP_URL}}api/integrations/mercado_pago/payment?redirect_status=success`,
          failure: `${process.env.NEXT_PUBLIC_WEBAPP_URL}}api/integrations/mercado_pago/payment?redirect_status=failure`,
          pending: `${process.env.NEXT_PUBLIC_WEBAPP_URL}}api/integrations/mercado_pago/payment?redirect_status=pending`,
        },
        auto_return: "approved",
        external_reference: paymentData.uid,
      });

      await prisma?.payment.update({
        where: {
          id: paymentData.id,
        },
        data: {
          externalId: preference?.body.id,
          data: Object.assign({}, preference.body, {
            mp_public_key: this.credentials.public_key,
            mp_access_token: this.credentials.access_token,
          }) as unknown as Prisma.InputJsonValue,
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
