import type { Booking, Payment, Prisma } from "@prisma/client";
import { PaymentType } from "@prisma/client";
import * as MercadoPago from "mercadopago";
import { v4 as uuidv4 } from "uuid";
import z from "zod";

import { AbstractPaymentService } from "@calcom/lib/PaymentService";
import prisma from "@calcom/prisma";

const mercadoPagoCredentialKeysSchema = z.object({
  access_token: z.string(),
  public_key: z.string(),
});

export class PaymentService extends AbstractPaymentService {
  private mercadoPago: typeof MercadoPago;
  private credentials: z.infer<typeof mercadoPagoCredentialKeysSchema>;

  constructor(credentials: { key: Prisma.JsonValue }) {
    super();

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
          type: PaymentType.MERCADO_PAGO,
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
  getPaymentPaidStatus(): string {
    throw new Error("Method not implemented.");
  }
  getPaymentDetails(): Payment {
    throw new Error("Method not implemented.");
  }
}
