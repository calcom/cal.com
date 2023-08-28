import type { Booking, Payment, PaymentOption, Prisma } from "@prisma/client";
import { v4 as uuidv4 } from "uuid";
import z from "zod";

import Paypal from "@calcom/app-store/paypal/lib/Paypal";
import { WEBAPP_URL } from "@calcom/lib/constants";
import prisma from "@calcom/prisma";
import type { CalendarEvent } from "@calcom/types/Calendar";
import type { IAbstractPaymentService } from "@calcom/types/PaymentService";

import { paymentOptionEnum } from "../zod";

export const paypalCredentialKeysSchema = z.object({
  client_id: z.string(),
  secret_key: z.string(),
  webhook_id: z.string(),
});

export class PaymentService implements IAbstractPaymentService {
  private credentials: z.infer<typeof paypalCredentialKeysSchema>;

  constructor(credentials: { key: Prisma.JsonValue }) {
    this.credentials = paypalCredentialKeysSchema.parse(credentials.key);
  }

  async create(
    payment: Pick<Prisma.PaymentUncheckedCreateInput, "amount" | "currency">,
    bookingId: Booking["id"]
  ) {
    try {
      const booking = await prisma.booking.findFirst({
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

      const uid = uuidv4();

      const paypalClient = new Paypal({
        clientId: this.credentials.client_id,
        secretKey: this.credentials.secret_key,
      });
      const orderResult = await paypalClient.createOrder({
        referenceId: uid,
        amount: payment.amount,
        currency: payment.currency,
        returnUrl: `${WEBAPP_URL}/api/integrations/paypal/capture?bookingUid=${booking.uid}`,
        cancelUrl: `${WEBAPP_URL}/payment/${uid}`,
      });
      const paymentData = await prisma.payment.create({
        data: {
          uid,
          app: {
            connect: {
              slug: "paypal",
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
  async refund(): Promise<Payment> {
    throw new Error("Method not implemented.");
  }

  async collectCard(
    payment: Pick<Prisma.PaymentUncheckedCreateInput, "amount" | "currency">,
    bookingId: number,
    _bookerEmail: string,
    paymentOption: PaymentOption
  ): Promise<Payment> {
    // Ensure that the payment service can support the passed payment option
    if (paymentOptionEnum.parse(paymentOption) !== "HOLD") {
      throw new Error("Payment option is not compatible with create method");
    }
    try {
      const booking = await prisma.booking.findFirst({
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

      const uid = uuidv4();

      const paypalClient = new Paypal({
        clientId: this.credentials.client_id,
        secretKey: this.credentials.secret_key,
      });
      const preference = await paypalClient.createOrder({
        referenceId: uid,
        amount: payment.amount,
        currency: payment.currency,
        returnUrl: `${WEBAPP_URL}/booking/${booking.uid}`,
        cancelUrl: `${WEBAPP_URL}/payment/${uid}`,
        intent: "AUTHORIZE",
      });

      const paymentData = await prisma.payment.create({
        data: {
          uid,
          app: {
            connect: {
              slug: "paypal",
            },
          },
          booking: {
            connect: {
              id: bookingId,
            },
          },
          amount: payment.amount,
          currency: payment.currency,
          data: Object.assign({}, preference) as unknown as Prisma.InputJsonValue,
          fee: 0,
          refunded: false,
          success: false,
          paymentOption: paymentOption || "ON_BOOKING",
          externalId: preference?.id,
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
    return Promise.resolve();
  }
  deletePayment(paymentId: number): Promise<boolean> {
    return Promise.resolve(false);
  }
}
