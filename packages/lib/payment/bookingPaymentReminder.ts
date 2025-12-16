import type { BookingSeat, Payment, Prisma } from "@prisma/client";

import appStore from "@calcom/app-store";
import prisma from "@calcom/prisma";
import { BookingStatus } from "@calcom/prisma/enums";
import type { EventTypeMetadata } from "@calcom/prisma/zod-utils";
import type { CalendarEvent } from "@calcom/types/Calendar";
import type { IAbstractPaymentService, PaymentApp } from "@calcom/types/PaymentService";

type PaymentAppCredentials = {
  key: Prisma.JsonValue;
  appId: string;
  appDirName?: string;
};

const isPaymentApp = (x: unknown): x is PaymentApp =>
  !!x &&
  typeof x === "object" &&
  "lib" in x &&
  typeof x.lib === "object" &&
  !!x.lib &&
  "PaymentService" in x.lib;

const isKeyOf = <T extends object>(obj: T, key: unknown): key is keyof T =>
  typeof key === "string" && key in obj;

type BookingData = {
  user: { email: string | null; name: string | null; timeZone: string } | null;
  id: number;
  startTime: { toISOString: () => string };
  uid: string;
};
const bookingPaymentReminderHandler = async ({ event, step }) => {
  const { evt, booking, paymentData, eventTypeMetadata, bookingSeatId, paymentAppCredentials } =
    event.data as {
      evt: CalendarEvent;
      booking: BookingData;
      paymentData: Payment;
      eventTypeMetadata?: EventTypeMetadata;
      bookingSeatId?: BookingSeat["id"];
      paymentAppCredentials: PaymentAppCredentials;
    };

  // Wait 10 minutes
  await step.sleep("wait-for-payment", "10m");

  // Check if payment is completed
  const shouldSendPaymentReminder = await step.run("check-payment-status", async () => {
    const bookingData = await prisma.booking.findFirst({
      where: {
        id: booking.id,
      },
      select: {
        status: true,
        payment: {
          where: {
            bookingSeatId: bookingSeatId,
          },
          select: {
            success: true,
          },
        },
      },
    });

    if (!bookingData) return false;

    const isPending = bookingData.status === BookingStatus.PENDING;
    const hasSuccessfulPaymentForSeat = bookingData.payment.some((p) => p.success === true);

    return isPending && !hasSuccessfulPaymentForSeat;
  });

  // If paid, trigger afterPayment reminder
  if (shouldSendPaymentReminder) {
    await step.run("process-after-payment", async () => {
      // Get payment app instance
      const key = paymentAppCredentials.appDirName;
      if (!key || !isKeyOf(appStore, key)) {
        throw new Error(`Invalid payment app key: ${key}`);
      }

      const paymentApp = await appStore[key]?.();
      if (!isPaymentApp(paymentApp)) {
        throw new Error(`Payment app service not found for ${key}`);
      }

      const PaymentService = paymentApp.lib.PaymentService;
      const paymentInstance = new PaymentService(paymentAppCredentials) as IAbstractPaymentService;

      // Trigger afterPayment with all the parameters
      await paymentInstance.afterPayment(evt, booking, paymentData, eventTypeMetadata, bookingSeatId);

      return { success: true, bookingId: booking.id };
    });
  }
};
export default bookingPaymentReminderHandler;
