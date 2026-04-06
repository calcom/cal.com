import type z from "zod";
import { v4 as uuidv4 } from "uuid";

import { WEBAPP_URL } from "@calcom/lib/constants";
import { ErrorCode } from "@calcom/lib/errorCodes";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import prisma from "@calcom/prisma";
import type { Booking, Payment, PaymentOption, Prisma } from "@calcom/prisma/client";
import type { CalendarEvent } from "@calcom/types/Calendar";
import type { IAbstractPaymentService } from "@calcom/types/PaymentService";

const log = logger.getSubLogger({ prefix: ["payment-service:paystack"] });

interface PaystackCredential {
  secretKey: string;
  publicKey: string;
}

class PaystackPaymentService implements IAbstractPaymentService {
  private credentials: PaystackCredential | null;

  constructor(credentials: { key: Prisma.JsonValue }) {
    const keyData = credentials.key as PaystackCredential | null;
    if (keyData && keyData.secretKey) {
      this.credentials = keyData;
    } else {
      this.credentials = null;
    }
  }

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
      const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        select: {
          uid: true,
          title: true,
          startTime: true,
          endTime: true,
          eventTypeId: true,
          eventType: {
            select: {
              slug: true,
              seatsPerTimeSlot: true,
            },
          },
          attendees: { include: { bookingSeat: true } },
        },
      });

      if (!booking || !this.credentials) {
        throw new Error("Booking or credentials not found");
      }

      // Check for seat availability
      const { startTime, endTime, eventTypeId } = booking;
      const bookingsWithSameTimeSlot = await prisma.booking.findMany({
        where: {
          eventTypeId,
          startTime,
          endTime,
          OR: [{ status: "PENDING" }, { status: "AWAITING_HOST" }],
        },
        select: { uid: true, title: true },
      });

      if (booking.eventType?.seatsPerTimeSlot) {
        if (
          booking.eventType.seatsPerTimeSlot <=
            booking.attendees.filter((attendee) => !!attendee.bookingSeat).length ||
          bookingsWithSameTimeSlot.length > booking.eventType.seatsPerTimeSlot
        ) {
          throw new Error(ErrorCode.BookingSeatsFull);
        }
      } else {
        if (bookingsWithSameTimeSlot.length > 1) {
          throw new Error(ErrorCode.NoAvailableUsersFound);
        }
      }

      const uid = uuidv4();

      // Create payment record
      const paymentData = await prisma.payment.create({
        data: {
          uid,
          app: {
            connect: {
              slug: "paystack",
            },
          },
          booking: {
            connect: {
              id: bookingId,
            },
          },
          amount: payment.amount,
          currency: payment.currency,
          externalId: uid,
          data: {
            bookingUserName: username,
            eventTypeSlug: booking.eventType?.slug,
            bookingUid: booking.uid,
            isPaid: false,
            paystackPublicKey: this.credentials.publicKey,
          } as unknown as Prisma.InputJsonValue,
          fee: 0,
          refunded: false,
          success: false,
        },
      });

      if (!paymentData) {
        throw new Error("Failed to store Payment data");
      }

      return paymentData;
    } catch (error: any) {
      log.error("Payment could not be created", bookingId, safeStringify(error));
      try {
        await prisma.booking.update({
          where: { id: bookingId },
          data: { status: "CANCELLED" },
        });
      } catch {
        throw new Error(ErrorCode.PaymentCreationFailure);
      }

      if (error.message === ErrorCode.BookingSeatsFull || error.message === ErrorCode.NoAvailableUsersFound) {
        throw error;
      }
      throw new Error(ErrorCode.PaymentCreationFailure);
    }
  }

  async update(): Promise<Payment> {
    throw new Error("Method not implemented.");
  }

  async refund(): Promise<Payment> {
    throw new Error("Method not implemented.");
  }

  async collectCard(
    _payment: Pick<Prisma.PaymentUncheckedCreateInput, "amount" | "currency">,
    _bookingId: number,
    _bookerEmail: string,
    _paymentOption: PaymentOption
  ): Promise<Payment> {
    throw new Error("Method not implemented");
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

  isSetupAlready(): boolean {
    return !!this.credentials;
  }
}

export function BuildPaymentService(credentials: { key: Prisma.JsonValue }): IAbstractPaymentService {
  return new PaystackPaymentService(credentials);
}
