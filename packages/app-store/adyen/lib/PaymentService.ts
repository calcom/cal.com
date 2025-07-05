import type { Booking, Payment, Prisma, PaymentOption } from "@prisma/client";
import { v4 as uuidv4 } from "uuid";
import type z from "zod";

import { WEBAPP_URL } from "@calcom/lib/constants";
import prisma from "@calcom/prisma";
import type { IAbstractPaymentService } from "@calcom/types/PaymentService";

import createPaymentSession from "./paymentSessions";
import { adyenCredentialKeysSchema } from "./types";

export class PaymentService implements IAbstractPaymentService {
  private credentials: z.infer<typeof adyenCredentialKeysSchema> | null;

  constructor(credentials: { key: Prisma.JsonValue }) {
    const keyParsing = adyenCredentialKeysSchema.safeParse(credentials.key);
    if (keyParsing.success) {
      this.credentials = keyParsing.data;
    } else {
      this.credentials = null;
    }
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
          userId: true,
        },
        where: {
          id: bookingId,
        },
      });

      if (booking === null) {
        throw new Error("Booking not found");
      }
      if (this.credentials === null) {
        throw new Error("Credentials not found");
      }

      const uid = uuidv4();

      const data = await createPaymentSession({
        amount: { currency: payment.currency, value: payment.amount },
        reference: uid,
        organizerUserId: booking?.userId || -1,
        returnUrl: `${WEBAPP_URL}/bookings?bookingUid=${booking.uid}`,
      });

      const paymentData = await prisma.payment.create({
        data: {
          uid,
          app: {
            connect: {
              slug: "adyen",
            },
          },
          booking: {
            connect: {
              id: bookingId,
            },
          },
          amount: payment.amount,
          externalId: uid,
          currency: payment.currency,
          data: Object.assign(
            {},
            { sessionId: data?.id, sessionData: data?.sessionData, clientKey: this.credentials.client_key }
          ) as unknown as Prisma.InputJsonValue,
          fee: 0,
          refunded: false,
          success: false,
        },
      });

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
      if (booking === null) {
        throw new Error("Booking not found");
      }

      const uid = uuidv4();

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
          data: {} as Prisma.InputJsonValue,
          fee: 0,
          refunded: false,
          success: false,
          paymentOption,
          externalId: "",
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
  chargeCard(): Promise<Payment> {
    throw new Error("Method not implemented.");
  }
  getPaymentPaidStatus(): Promise<string> {
    throw new Error("Method not implemented.");
  }
  getPaymentDetails(): Promise<Payment> {
    throw new Error("Method not implemented.");
  }
  afterPayment(): Promise<void> {
    return Promise.resolve();
  }
  deletePayment(): Promise<boolean> {
    return Promise.resolve(false);
  }

  isSetupAlready(): boolean {
    return !!this.credentials;
  }
}
