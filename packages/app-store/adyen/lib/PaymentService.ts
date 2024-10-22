import type { Booking, Payment, PaymentOption, Prisma } from "@prisma/client";
import type z from "zod";

import { getErrorFromUnknown } from "@calcom/lib/errors";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import prisma from "@calcom/prisma";
import type { IAbstractPaymentService } from "@calcom/types/PaymentService";

import { adyenPaymentDataSchema, appKeysSchema, paymentOptionEnum } from "../zod";
import { capturePaymentSession } from "./client/capturePayment";
import { createPaymentSession } from "./client/createPaymentSession";
import { refundPaymentSession } from "./client/refundPayment";

const log = logger.getSubLogger({ prefix: ["payment-service:adyen"] });

export class PaymentService implements IAbstractPaymentService {
  private credentials: z.infer<typeof appKeysSchema> | null;

  constructor(credentials: { key: Prisma.JsonValue }) {
    const keyParsing = appKeysSchema.safeParse(credentials.key);
    if (keyParsing.success) {
      this.credentials = keyParsing.data;
    } else {
      this.credentials = null;
    }
  }

  private async getPayment(where: Prisma.PaymentWhereInput) {
    const payment = await prisma.payment.findFirst({ where });
    if (!payment) throw new Error("Payment not found");
    if (!payment.externalId) throw new Error("Payment externalId not found");
    return { ...payment, externalId: payment.externalId };
  }

  /* This method is for creating charges at the time of booking */
  async create(
    payment: Pick<Prisma.PaymentUncheckedCreateInput, "amount" | "currency">,
    bookingId: Booking["id"],
    userId: Booking["userId"],
    username: string | null,
    bookerName: string,
    paymentOption: PaymentOption,
    bookerEmail: string
  ) {
    try {
      // Ensure that the payment service can support the passed payment option
      if (paymentOptionEnum.parse(paymentOption) !== "ON_BOOKING") {
        throw new Error("Payment option is not compatible with create method");
      }

      if (!this.credentials) {
        throw new Error("Adyen credentials not found");
      }

      const { session, idempotencyKey } = await createPaymentSession({
        credentials: this.credentials,
        payment,
        shopperEmail: bookerEmail,
      });
      const paymentData = await prisma.payment.create({
        data: {
          uid: session.reference,
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
          currency: payment.currency,
          externalId: session.id,
          data: Object.assign(
            {},
            {
              session,
              idempotencyKey,
              bookerEmail,
              clientKey: this.credentials.client_key,
            }
          ) as unknown as Prisma.InputJsonValue,
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
      log.error("Adyen: Payment could not be created", bookingId, safeStringify(error));
      throw new Error("payment_not_created_error");
    }
  }

  async collectCard(
    payment: Pick<Prisma.PaymentUncheckedCreateInput, "amount" | "currency">,
    bookingId: Booking["id"],
    paymentOption: PaymentOption,
    bookerEmail: string,
    _bookerPhoneNumber?: string | null
  ): Promise<Payment> {
    try {
      // Ensure that the payment service can support the passed payment option
      if (paymentOptionEnum.parse(paymentOption) !== "ON_BOOKING") {
        throw new Error("Payment option is not compatible with create method");
      }

      if (!this.credentials) {
        throw new Error("Adyen credentials not found");
      }

      const { session } = await createPaymentSession({
        credentials: this.credentials,
        payment,
        shopperEmail: bookerEmail,
        additionalArgs: {
          additionalData: { manualCapture: "true" },
        },
      });

      const paymentData = await prisma.payment.create({
        data: {
          uid: session.reference,
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
          currency: payment.currency,
          externalId: session.id,
          data: Object.assign(
            {},
            {
              session,
              idempotencyKey,
              bookerEmail,
              clientKey: this.credentials.client_key,
            }
          ) as unknown as Prisma.InputJsonValue,
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
      log.error("Adyen: Payment could not be created", bookingId, safeStringify(error));
      throw new Error("payment_not_created_error");
    }
  }

  async chargeCard(payment: Payment, _bookingId?: Booking["id"]): Promise<Payment> {
    if (!this.credentials) {
      throw new Error("Adyen credentials not found");
    }

    const adyenPaymentData = adyenPaymentDataSchema.safeParse(payment.data);

    if (!adyenPaymentData.success) {
      throw new Error("Malformed adyen Payment data keys");
    }

    if (!adyenPaymentData.data.pspReference) {
      throw new Error("Card not yet collected");
    }

    const { paymentCaptureResponse, idempotencyKey } = await capturePaymentSession({
      credentials: this.credentials,
      payment,
      pspReference: adyenPaymentData.data.pspReference,
    });

    const paymentData = await prisma.payment.update({
      where: {
        id: payment.id,
      },
      data: {
        success: true,
        data: {
          ...adyenPaymentData,
          paymentCaptureResponse,
        },
      },
    });

    if (!paymentData) {
      throw new Error("Updating payment unsuccesful");
    }

    return paymentData;
  }

  async update(): Promise<Payment> {
    throw new Error("Method not implemented.");
  }

  async refund(paymentId: Payment["id"]): Promise<Payment> {
    try {
      if (!this.credentials) {
        throw new Error("Adyen credentials not found");
      }

      const payment = await this.getPayment({
        id: paymentId,
        success: true,
        refunded: false,
      });

      const adyenPaymentData = adyenPaymentDataSchema.safeParse(payment.data);

      if (!adyenPaymentData.success) {
        throw new Error("Malformed adyen Payment data keys");
      }

      if (!adyenPaymentData.data.pspReference) {
        throw new Error("Card not yet collected");
      }

      await refundPaymentSession({
        credentials: this.credentials,
        payment,
        pspReference: adyenPaymentData.data.pspReference,
      });

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

  async afterPayment(): Promise<void> {
    return Promise.resolve();
  }

  async deletePayment(paymentId: Payment["id"]): Promise<boolean> {
    try {
      // Same endpoint both cancels/refunds despite if payment has already been captured.
      await this.refund(paymentId);
      return true;
    } catch (e) {
      log.error("Stripe: Unable to delete Payment in stripe of paymentId", paymentId, safeStringify(e));
      return false;
    }
  }

  getPaymentPaidStatus(): Promise<string> {
    throw new Error("Method not implemented.");
  }

  getPaymentDetails(): Promise<Payment> {
    throw new Error("Method not implemented.");
  }

  isSetupAlready(): boolean {
    return !!this.credentials;
  }
}
