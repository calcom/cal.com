import { ErrorCode } from "@calcom/lib/errorCodes";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import prisma from "@calcom/prisma";
import type { Booking, Payment, PaymentOption, Prisma } from "@calcom/prisma/client";
import type { CalendarEvent } from "@calcom/types/Calendar";
import type { IAbstractPaymentService } from "@calcom/types/PaymentService";
import { v4 as uuidv4 } from "uuid";
import type { LawPayCredential } from "../types";
import { lawPayCredentialSchema } from "../types";
import { LawPayAPI } from "./LawPayAPI";

const log = logger.getSubLogger({ prefix: ["payment-service:lawpay"] });

class LawPayPaymentService implements IAbstractPaymentService {
  private credentials: LawPayCredential | null;

  constructor(credentials: { key: Prisma.JsonValue }) {
    const keyParsing = lawPayCredentialSchema.safeParse(credentials.key);
    if (keyParsing.success) {
      this.credentials = keyParsing.data;
    } else {
      this.credentials = null;
    }
  }

  async create(
    payment: Pick<Prisma.PaymentUncheckedCreateInput, "amount" | "currency">,
    bookingId: Booking["id"],
    _userId: Booking["userId"],
    username: string | null,
    _bookerName: string | null,
    _paymentOption: PaymentOption,
    _bookerEmail: string,
    _bookerPhoneNumber?: string | null,
    eventTitle?: string,
    bookingTitle?: string
  ): Promise<Payment> {
    try {
      const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        select: {
          uid: true,
          title: true,
          eventType: { select: { slug: true, teamId: true } },
        },
      });

      if (!booking || !this.credentials) {
        throw new Error("Booking or LawPay credentials not found");
      }

      const api = new LawPayAPI(this.credentials);
      const amountInDollars = payment.amount / 100;
      const metadata: Record<string, string> = {
        bookingId: String(bookingId),
        bookingUid: booking.uid,
      };
      if (eventTitle) metadata.eventTitle = eventTitle;
      if (bookingTitle) metadata.bookingTitle = bookingTitle;

      const intentResponse = (await api.createPaymentIntent(amountInDollars, payment.currency, metadata)) as {
        id?: string;
        status?: string;
        amount?: number;
        currency?: string;
        checkout_url?: string;
        url?: string;
        redirect_url?: string;
        next_action?: { redirect_url?: string };
        client_secret?: string;
      };

      const paymentUrl =
        intentResponse.checkout_url ??
        intentResponse.url ??
        intentResponse.redirect_url ??
        intentResponse.next_action?.redirect_url;

      const uid = uuidv4();
      const externalId = intentResponse.id ?? uid;

      const paymentData = await prisma.payment.create({
        data: {
          uid,
          app: { connect: { slug: "lawpay" } },
          booking: { connect: { id: bookingId } },
          amount: payment.amount,
          currency: payment.currency,
          externalId,
          data: {
            id: intentResponse.id,
            status: intentResponse.status ?? "pending",
            amount: payment.amount,
            currency: payment.currency,
            payment_url: paymentUrl ?? undefined,
            checkout_url: paymentUrl ?? undefined,
            bookingUid: booking.uid,
            eventTypeSlug: booking.eventType?.slug,
            bookingUserName: username,
          } as unknown as Prisma.InputJsonValue,
          fee: 0,
          refunded: false,
          success: false,
        },
      });

      return paymentData;
    } catch (error) {
      log.error("LawPay payment could not be created", bookingId, safeStringify(error));
      try {
        await prisma.booking.update({
          where: { id: bookingId },
          data: { status: "CANCELLED" },
        });
      } catch {
        // ignore
      }
      throw new Error(ErrorCode.PaymentCreationFailure);
    }
  }

  async collectCard(
    _payment: Pick<Prisma.PaymentUncheckedCreateInput, "amount" | "currency">,
    _bookingId: Booking["id"],
    _paymentOption: PaymentOption,
    _bookerEmail: string,
    _bookerPhoneNumber?: string | null
  ): Promise<Payment> {
    throw new Error("Method not implemented.");
  }

  chargeCard(
    _payment: Pick<Prisma.PaymentUncheckedCreateInput, "amount" | "currency">,
    _bookingId?: Booking["id"]
  ): Promise<Payment> {
    throw new Error("Method not implemented.");
  }

  async update(
    _paymentId: Payment["id"],
    _data: Partial<Prisma.PaymentUncheckedCreateInput>
  ): Promise<Payment> {
    throw new Error("Method not implemented.");
  }

  async refund(paymentId: Payment["id"]): Promise<Payment | null> {
    try {
      const payment = await prisma.payment.findUnique({
        where: { id: paymentId },
        select: {
          externalId: true,
          appId: true,
          bookingId: true,
          booking: {
            select: {
              userId: true,
              eventType: { select: { teamId: true } },
            },
          },
        },
      });
      if (!payment || payment.appId !== "lawpay" || !payment.externalId) {
        return null;
      }
      const teamId = payment.booking?.eventType?.teamId ?? null;
      const userId = payment.booking?.userId ?? null;
      if (teamId == null && userId == null) {
        log.error("LawPay refund failed: no teamId or userId found", paymentId);
        return null;
      }
      const credential = await prisma.credential.findFirst({
        where: {
          type: "lawpay_payment",
          ...(teamId ? { teamId } : { userId }),
        },
        select: { key: true },
      });
      if (!credential?.key) return null;
      const parsed = lawPayCredentialSchema.safeParse(credential.key);
      if (!parsed.success) return null;
      const api = new LawPayAPI(parsed.data);
      await api.refundCharge(payment.externalId);
      const updated = await prisma.payment.update({
        where: { id: paymentId },
        data: { refunded: true },
      });
      return updated;
    } catch (error) {
      log.error("LawPay refund failed", paymentId, safeStringify(error));
      return null;
    }
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
    _paymentData: Payment,
    _eventTypeMetadata?: unknown
  ): Promise<void> {
    return Promise.resolve();
  }

  deletePayment(_paymentId: Payment["id"]): Promise<boolean> {
    return Promise.resolve(false);
  }

  isSetupAlready(): boolean {
    return !!this.credentials;
  }
}

/**
 * Factory function that creates a LawPay Payment service instance.
 * This is exported instead of the class to prevent internal types
 * from leaking into the emitted .d.ts file.
 */
export function BuildPaymentService(credentials: { key: Prisma.JsonValue }): IAbstractPaymentService {
  return new LawPayPaymentService(credentials);
}
