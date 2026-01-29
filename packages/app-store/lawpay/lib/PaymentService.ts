import { v4 as uuidv4 } from "uuid";
import z from "zod";

import LawPay from "@calcom/app-store/lawpay/lib/LawPay";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { ErrorCode } from "@calcom/lib/errorCodes";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import prisma from "@calcom/prisma";
import type { Booking, Payment, PaymentOption, Prisma } from "@calcom/prisma/client";
import type { IAbstractPaymentService } from "@calcom/types/PaymentService";

import { paymentOptionEnum } from "../zod";

const log = logger.getSubLogger({ prefix: ["payment-service:lawpay"] });

export const lawpayCredentialKeysSchema = z.object({
  client_id: z.string(),
  client_secret: z.string(),
  account_id: z.string(),
  secret_key: z.string(),
  public_key: z.string(),
});

class LawPayPaymentService implements IAbstractPaymentService {
  private credentials: z.infer<typeof lawpayCredentialKeysSchema> | null;

  constructor(credentials: { key: Prisma.JsonValue }) {
    const keyParsing = lawpayCredentialKeysSchema.safeParse(credentials.key);
    this.credentials = keyParsing.success ? keyParsing.data : null;
  }

  async create(
    payment: Pick<Prisma.PaymentUncheckedCreateInput, "amount" | "currency">,
    bookingId: Booking["id"]
  ) {
    try {
      const booking = await prisma.booking.findUnique({
        select: { uid: true, title: true },
        where: { id: bookingId },
      });

      if (!booking || !this.credentials) {
        throw new Error("Booking or credentials not found");
      }

      const uid = uuidv4();
      const lawpayClient = new LawPay({
        secretKey: this.credentials.secret_key,
        accountId: this.credentials.account_id,
      });

      const paymentData = await prisma.payment.create({
        data: {
          uid,
          app: { connect: { slug: "lawpay" } },
          booking: { connect: { id: bookingId } },
          amount: payment.amount,
          externalId: "",
          currency: payment.currency,
          data: { pendingPayment: true } as unknown as Prisma.InputJsonValue,
          fee: 0,
          refunded: false,
          success: false,
        },
      });

      return paymentData;
    } catch (error) {
      log.error("LawPay: Payment could not be created for bookingId", bookingId, safeStringify(error));
      throw new Error(ErrorCode.PaymentCreationFailure);
    }
  }

  async update(): Promise<Payment> {
    throw new Error("Method not implemented.");
  }

  async refund(paymentId: number): Promise<Payment> {
    const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment?.externalId || !this.credentials) {
      throw new Error("Payment or credentials not found");
    }

    const lawpayClient = new LawPay({
      secretKey: this.credentials.secret_key,
      accountId: this.credentials.account_id,
    });

    await lawpayClient.refund(payment.externalId, payment.amount);

    return prisma.payment.update({
      where: { id: paymentId },
      data: { refunded: true },
    });
  }

  async collectCard(
    payment: Pick<Prisma.PaymentUncheckedCreateInput, "amount" | "currency">,
    bookingId: number,
    paymentOption: PaymentOption
  ): Promise<Payment> {
    if (paymentOptionEnum.parse(paymentOption) !== "ON_BOOKING") {
      throw new Error("Payment option not supported");
    }
    return this.create(payment, bookingId);
  }

  async chargeCard(payment: Payment): Promise<Payment> {
    if (!this.credentials) throw new Error("Credentials not found");

    const data = payment.data as { tokenId?: string };
    if (!data.tokenId) throw new Error("Token not found");

    const lawpayClient = new LawPay({
      secretKey: this.credentials.secret_key,
      accountId: this.credentials.account_id,
    });

    const charge = await lawpayClient.createCharge({
      amount: payment.amount,
      currency: payment.currency,
      tokenId: data.tokenId,
      reference: `booking-${payment.bookingId}`,
    });

    return prisma.payment.update({
      where: { id: payment.id },
      data: {
        externalId: charge.id,
        success: charge.status === "AUTHORIZED" || charge.status === "COMPLETED",
        data: { ...data, charge } as unknown as Prisma.InputJsonValue,
      },
    });
  }

  async getPaymentPaidStatus(): Promise<string> {
    throw new Error("Method not implemented.");
  }

  async getPaymentDetails(): Promise<Payment> {
    throw new Error("Method not implemented.");
  }

  async afterPayment(): Promise<void> {
    return Promise.resolve();
  }

  async deletePayment(paymentId: number): Promise<boolean> {
    const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment?.externalId || !this.credentials) return false;

    try {
      const lawpayClient = new LawPay({
        secretKey: this.credentials.secret_key,
        accountId: this.credentials.account_id,
      });
      await lawpayClient.voidTransaction(payment.externalId);
      return true;
    } catch {
      return false;
    }
  }

  isSetupAlready(): boolean {
    return !!this.credentials;
  }
}

export function BuildPaymentService(credentials: { key: Prisma.JsonValue }): IAbstractPaymentService {
  return new LawPayPaymentService(credentials);
}
