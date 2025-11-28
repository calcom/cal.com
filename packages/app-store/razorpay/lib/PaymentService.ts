import type { Booking, BookingSeat, Payment, PaymentOption, Prisma } from "@prisma/client";
import { v4 as uuidv4 } from "uuid";
import z from "zod";

import { default as Razorpay } from "@calcom/app-store/razorpay/lib/Razorpay";
import { sendAwaitingPaymentEmailAndSMS } from "@calcom/emails";
import { ErrorCode } from "@calcom/lib/errorCodes";
import { getErrorFromUnknown } from "@calcom/lib/errors";
import { isPrismaObjOrUndefined } from "@calcom/lib/isPrismaObj";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import prisma from "@calcom/prisma";
import type { EventTypeMetadata } from "@calcom/prisma/zod-utils";
import type { CalendarEvent } from "@calcom/types/Calendar";
import type { IAbstractPaymentService } from "@calcom/types/PaymentService";

const log = logger.getSubLogger({ prefix: ["payment-service:razorpay"] });

export const razorpayCredentialKeysSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  public_token: z.string(),
  account_id: z.string(),
  userId: z.number(),
});
export class PaymentService implements IAbstractPaymentService {
  private credentials: z.infer<typeof razorpayCredentialKeysSchema> | null;
  private razorpay: Razorpay;

  constructor(credentials: { key: Prisma.JsonValue }) {
    const keyParsing = razorpayCredentialKeysSchema.safeParse(credentials.key);
    if (keyParsing.success) {
      this.credentials = keyParsing.data;
      this.razorpay = new Razorpay({
        access_token: this.credentials.access_token,
        refresh_token: this.credentials.refresh_token,
        user_id: this.credentials.userId,
      });
    } else {
      throw new Error("Razorpay: Credentials Invalid");
    }
  }

  async create(
    payment: Pick<Prisma.PaymentUncheckedCreateInput, "amount" | "currency">,
    bookingId: Booking["id"],
    bookingSeat?: BookingSeat["id"],
    userId: Booking["userId"],
    username: string | null,
    bookerName: string | null,
    paymentOption: PaymentOption,
    bookerEmail: string,
    bookingUid: string,
    bookerPhoneNumber?: string | null,
    eventTitle?: string,
    bookingTitle?: string,
    responses: Prisma.JsonValue,
  ) {
    try {
      if (!this.credentials) {
        throw new Error("Razorpay: Credentials are not set for the payment service");
      }

      const uid = uuidv4();
      const paymentLinkRes = await this.razorpay.createPaymentLink({
        bookingUid,
        reference_id: uid,
        amount: payment.amount,
        currency: payment.currency,
        customer: {
          name: bookerName ?? "No Name",
          email: bookerEmail,
          contact: bookerPhoneNumber || undefined,
        },
        eventTitle: eventTitle || bookingTitle || "",
      });

      const paymentData = await prisma.payment.create({
        data: {
          uid,
          app: {
            connect: {
              slug: "razorpay",
            },
          },
          booking: {
            connect: {
              id: bookingId,
            },
          },
          bookingSeat: bookingSeat
            ? {
                connect: {
                  id: bookingSeat,
                },
              }
            : undefined,
          amount: payment.amount,
          externalId: paymentLinkRes.id, //Payment link id
          currency: payment.currency,
          data: Object.assign(
            {},
            {
              currency: paymentLinkRes.currency,
              amount: paymentLinkRes.amount,
              account_id: paymentLinkRes.user_id,
              paymentLink: paymentLinkRes.short_url,
            }
          ) as unknown as Prisma.InputJsonValue,
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
      log.error("Razorpay: Payment could not be created for bookingId", bookingId, safeStringify(error));
      throw new Error(ErrorCode.PaymentCreationFailure);
    }
  }
  async update(): Promise<Payment> {
    throw new Error("Method not implemented.");
  }

  private async getPaymentLinkId(where: Prisma.PaymentWhereInput) {
    const payment = await prisma.payment.findFirst({ where });
    if (!payment) throw new Error("Payment not found");
    if (!payment.externalId) throw new Error("Payment externalId not found");
    return payment.externalId as string;
  }
  private async getPaymentRefNo(where: Prisma.PaymentWhereInput) {
    const payment = await prisma.payment.findFirst({ where });
    if (!payment) throw new Error("Payment not found");
    if (!payment.externalId) throw new Error("Payment externalId not found");
    if (!payment) {
      throw new Error("Payment not found");
    }

    const paymentdata = isPrismaObjOrUndefined(payment.data);

    if (!paymentdata) {
      throw new Error("Payment data not found");
    }
    return paymentdata.paymentId as string;
  }
  async refund(paymentId: number): Promise<Payment> {
    try {
      const paymentRefNo = await this.getPaymentRefNo({
        id: paymentId,
        success: true,
        refunded: false,
      });

      const refundInitiated = await this.razorpay.initiateRefund(paymentRefNo as string);

      if (!refundInitiated) {
        throw new Error("Refund could not be initiated");
      }

      const updatedPayment = await prisma.payment.update({
        where: {
          id: paymentId,
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

  collectCard(): Promise<Payment> {
    throw new Error("Payment option is not compatible with create method");
  }

  async afterPayment(
    event: CalendarEvent,
    booking: {
      user: { email: string | null; name: string | null; timeZone: string } | null;
      id: number;
      startTime: { toISOString: () => string };
      uid: string;
    },
    bookingSeat: BookingSeat["id"],
    paymentData: Payment,
    eventTypeMetadata?: EventTypeMetadata
  ): Promise<void> {
    const paymentLink = isPrismaObjOrUndefined(paymentData.data)?.paymentLink;

    if (!paymentLink) {
      return Promise.resolve();
    }

    await sendAwaitingPaymentEmailAndSMS(
      {
        ...event,
        paymentInfo: {
          link: paymentLink as string,
          paymentOption: paymentData.paymentOption || "ON_BOOKING",
          amount: paymentData.amount,
          currency: paymentData.currency,
        },
      },
      eventTypeMetadata,
      bookingSeat
    );
  }

  async deletePayment(paymentId: number): Promise<boolean> {
    try {
      const paymentRefNo = await this.getPaymentLinkId({
        id: paymentId,
      });

      const paymentDeleted = await this.razorpay.handleCancelPayment(paymentRefNo);

      return paymentDeleted;
    } catch (e) {
      log.error("Stripe: Unable to delete Payment in stripe of paymentId", paymentId, safeStringify(e));
      return false;
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

  isSetupAlready(): boolean {
    return !!this.credentials;
  }
}
