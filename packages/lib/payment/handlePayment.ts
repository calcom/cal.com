import { JobName, dispatcher } from "@calid/job-dispatcher";
import { QueueName } from "@calid/queue";
import type { AppCategories, Prisma } from "@prisma/client";

import appStore from "@calcom/app-store";
import type { EventTypeAppsList } from "@calcom/app-store/utils";
import { isPrismaObjOrUndefined } from "@calcom/lib/isPrismaObj";
import logger from "@calcom/lib/logger";
import prisma from "@calcom/prisma";
import type { CompleteEventType } from "@calcom/prisma/zod";
import { eventTypeAppMetadataOptionalSchema } from "@calcom/prisma/zod-utils";
import type { CalendarEvent } from "@calcom/types/Calendar";
import type { IAbstractPaymentService, PaymentApp } from "@calcom/types/PaymentService";

const log = logger.getSubLogger({ prefix: ["[handle-payment]"] });

const isPaymentApp = (x: unknown): x is PaymentApp =>
  !!x &&
  typeof x === "object" &&
  "lib" in x &&
  typeof x.lib === "object" &&
  !!x.lib &&
  "PaymentService" in x.lib;

const isKeyOf = <T extends object>(obj: T, key: unknown): key is keyof T =>
  typeof key === "string" && key in obj;

export type PaymentBookingInfo = {
  user: { email: string | null; name: string | null; timeZone: string; username: string | null } | null;
  id: number;
  userId: number | null;
  startTime: { toISOString: () => string };
  uid: string;
};

const handlePayment = async ({
  evt,
  selectedEventType,
  paymentAppCredentials,
  booking,
  bookerName,
  bookerEmail,
  bookerPhoneNumber,
  isDryRun = false,
  responses,
  bookingSeat,
}: {
  evt: CalendarEvent;
  selectedEventType: Pick<CompleteEventType, "metadata" | "title">;
  paymentAppCredentials: {
    key: Prisma.JsonValue;
    appId: EventTypeAppsList;
    app: {
      dirName: string;
      categories: AppCategories[];
    } | null;
  };
  booking: PaymentBookingInfo;
  bookerName: string;
  bookerEmail: string;
  bookerPhoneNumber?: string | null;
  isDryRun?: boolean;
  bookingSeat?: {
    id: number;
  };
  responses: Prisma.JsonValue;
}) => {
  if (isDryRun) return null;

  const key = paymentAppCredentials?.app?.dirName;
  if (!isKeyOf(appStore, key)) {
    log.warn("Invalid payment app key", { key });
    return null;
  }

  const paymentApp = await appStore[key]?.();
  if (!isPaymentApp(paymentApp)) {
    log.warn("Payment app service not implemented", { type: typeof paymentApp });
    return null;
  }

  const PaymentService = paymentApp.lib.PaymentService;
  const paymentInstance = new PaymentService(paymentAppCredentials) as IAbstractPaymentService;

  const apps = eventTypeAppMetadataOptionalSchema.parse(selectedEventType?.metadata?.apps);
  const paymentOption = apps?.[paymentAppCredentials.appId].paymentOption || "ON_BOOKING";

  const existingPayment = await prisma.payment.findFirst({
    where: { bookingId: booking.id, ...(bookingSeat ? { bookingSeatId: bookingSeat.id } : {}) },
  });

  let paymentInfo;

  const paymentData = isPrismaObjOrUndefined(existingPayment?.data);

  if (paymentData?.expireBy) {
    if (typeof paymentData.expireBy === "number" || typeof paymentData.expireBy === "bigint") {
      const expireBy = paymentData.expireBy * 1000;
      const now = Date.now();

      if (now < expireBy) {
        paymentInfo = existingPayment;
      }
    }
  }

  if (!paymentInfo && existingPayment) {
    await prisma.payment.delete({
      where: { id: existingPayment?.id },
    });
  }

  if (!paymentInfo) {
    if (paymentOption === "HOLD") {
      paymentInfo = await paymentInstance.collectCard(
        {
          amount: apps?.[paymentAppCredentials.appId].price,
          currency: apps?.[paymentAppCredentials.appId].currency,
        },
        booking.id,
        paymentOption,
        bookerEmail,
        bookerPhoneNumber
      );
    } else {
      paymentInfo = await paymentInstance.create(
        {
          amount: apps?.[paymentAppCredentials.appId].price,
          currency: apps?.[paymentAppCredentials.appId].currency,
        },
        booking.id,
        booking.userId,
        booking.user?.username ?? null,
        bookerName,
        paymentOption,
        bookerEmail,
        booking.uid,
        bookingSeat?.id,
        bookerPhoneNumber,
        selectedEventType.title,
        evt.title,
        booking.responses ?? responses
      );
    }
  }

  if (!paymentInfo) {
    log.error("Payment data is null", { bookingId: booking.id });
    throw new Error("Payment data is null");
  }

  try {
    // Serialize event (remove translate functions for dispatching)
    const serializableEvt = {
      ...evt,
      organizer: {
        ...evt.organizer,
        language: {
          locale: evt.organizer.language.locale,
        },
      },
      attendees: evt.attendees.map((attendee) => ({
        ...attendee,
        language: {
          locale: attendee.language.locale,
        },
      })),
    };

    log.info("Dispatching payment reminder job", {
      bookingId: booking.id,
      delay: "10 minutes",
    });

    // Schedule payment reminder via dispatcher (10 minute delay)
    await dispatcher.dispatch({
      queue: QueueName.DEFAULT,
      name: JobName.BOOKING_PAYMENT_REMINDER,
      data: {
        evt: serializableEvt,
        booking: {
          user: booking.user,
          id: booking.id,
          startTime: booking.startTime,
          uid: booking.uid,
        },
        paymentData: paymentInfo,
        eventTypeMetadata: selectedEventType?.metadata,
        bookingSeatId: bookingSeat?.id,
        paymentAppCredentials: {
          key: paymentAppCredentials.key,
          appId: paymentAppCredentials.appId,
          appDirName: paymentAppCredentials.app?.dirName,
        },
      },
      // 10 minute delay - preserve for Inngest fallback
      inngestTs: Date.now() + 10 * 60 * 1000,
      bullmqOptions: {
        delay: 10 * 60 * 1000, // 10 minutes
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 5000,
        },
        removeOnComplete: {
          count: 1000,
          age: 86400,
        },
        removeOnFail: {
          count: 5000,
        },
      },
    });

    log.info("Payment reminder job dispatched successfully", {
      bookingId: booking.id,
    });
  } catch (error) {
    log.error("Failed to dispatch payment reminder job", {
      bookingId: booking.id,
      error: error instanceof Error ? error.message : String(error),
    });
    // Don't throw - payment was created successfully, reminder is just a bonus
  }

  return paymentInfo;
};

export { handlePayment };
