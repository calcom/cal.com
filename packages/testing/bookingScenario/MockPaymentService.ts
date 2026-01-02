import prismaMock from "../../../../../tests/libs/__mocks__/prisma";

import "vitest-fetch-mock";

import { sendAwaitingPaymentEmailAndSMS } from "@calcom/emails/email-manager";
import logger from "@calcom/lib/logger";
import type { Payment, Prisma, PaymentOption, Booking } from "@calcom/prisma/client";
import type { CalendarEvent } from "@calcom/types/Calendar";
import type { IAbstractPaymentService } from "@calcom/types/PaymentService";

export function getMockPaymentService() {
  function createPaymentLink(/*{ paymentUid, name, email, date }*/) {
    return "http://mock-payment.example.com/";
  }
  const paymentUid = "MOCK_PAYMENT_UID";
  const externalId = "mock_payment_external_id";

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  class MockPaymentService implements IAbstractPaymentService {
    // TODO: We shouldn't need to implement adding a row to Payment table but that's a requirement right now.
    // We should actually delegate table creation to the core app. Here, only the payment app specific logic should come
    async create(
      payment: Pick<Prisma.PaymentUncheckedCreateInput, "amount" | "currency">,
      bookingId: Booking["id"],
      userId: Booking["userId"],
      username: string | null,
      bookerName: string | null,
      bookerEmail: string,
      paymentOption: PaymentOption
    ) {
      const paymentCreateData = {
        id: 1,
        uid: paymentUid,
        appId: null,
        bookingId,
        // booking       Booking?       @relation(fields: [bookingId], references: [id], onDelete: Cascade)
        fee: 10,
        success: false,
        refunded: false,
        data: {},
        externalId,
        paymentOption,
        amount: payment.amount,
        currency: payment.currency,
      };

      const paymentData = await prismaMock.payment.create({
        data: paymentCreateData,
      });
      logger.silly("Created mock payment", JSON.stringify({ paymentData }));

      const verifyPayment = await prismaMock.payment.findFirst({
        where: { externalId: paymentCreateData.externalId },
      });
      logger.silly("Verified payment exists", JSON.stringify({ verifyPayment }));

      return paymentData;
    }
    async afterPayment(
      event: CalendarEvent,
      booking: {
        user: { email: string | null; name: string | null; timeZone: string } | null;
        id: number;
        startTime: { toISOString: () => string };
        uid: string;
      },
      paymentData: Payment
    ): Promise<void> {
      // TODO: App implementing PaymentService is supposed to send email by itself at the moment.
      await sendAwaitingPaymentEmailAndSMS({
        ...event,
        paymentInfo: {
          link: createPaymentLink(/*{
            paymentUid: paymentData.uid,
            name: booking.user?.name,
            email: booking.user?.email,
            date: booking.startTime.toISOString(),
          }*/),
          paymentOption: paymentData.paymentOption || "ON_BOOKING",
          amount: paymentData.amount,
          currency: paymentData.currency,
        },
      });
    }
  }
  return {
    paymentUid,
    externalId,
    MockPaymentService,
  };
}
