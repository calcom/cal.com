import type { AppCategories, Prisma } from "@prisma/client";

import appStore from "@calcom/app-store";
import type { EventTypeAppsList } from "@calcom/app-store/utils";
import type { CompleteEventType } from "@calcom/prisma/zod";
import { eventTypeAppMetadataOptionalSchema } from "@calcom/prisma/zod-utils";
import type { CalendarEvent } from "@calcom/types/Calendar";
import type { IAbstractPaymentService, PaymentApp } from "@calcom/types/PaymentService";
import { inngestClient } from "@calcom/web/pages/api/inngest";

import { INNGEST_ID } from "../constants";

const isPaymentApp = (x: unknown): x is PaymentApp =>
  !!x &&
  typeof x === "object" &&
  "lib" in x &&
  typeof x.lib === "object" &&
  !!x.lib &&
  "PaymentService" in x.lib;

const isKeyOf = <T extends object>(obj: T, key: unknown): key is keyof T =>
  typeof key === "string" && key in obj;

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
  booking: {
    user: { email: string | null; name: string | null; timeZone: string; username: string | null } | null;
    id: number;
    userId: number | null;
    startTime: { toISOString: () => string };
    uid: string;
  };
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
    console.warn(`key: ${key} is not a valid key in appStore`);
    return null;
  }
  const paymentApp = await appStore[key]?.();
  if (!isPaymentApp(paymentApp)) {
    console.warn(`payment App service of type ${paymentApp} is not implemented`);
    return null;
  }
  const PaymentService = paymentApp.lib.PaymentService;
  const paymentInstance = new PaymentService(paymentAppCredentials) as IAbstractPaymentService;

  const apps = eventTypeAppMetadataOptionalSchema.parse(selectedEventType?.metadata?.apps);
  const paymentOption = apps?.[paymentAppCredentials.appId].paymentOption || "ON_BOOKING";

  let paymentData;
  if (paymentOption === "HOLD") {
    paymentData = await paymentInstance.collectCard(
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
    paymentData = await paymentInstance.create(
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

  if (!paymentData) {
    console.error("Payment data is null");
    throw new Error("Payment data is null");
  }
  try {
    // Schedule Inngest function to verify payment and trigger afterPayment after 10 minutes
    const key = INNGEST_ID === "onehash-cal" ? "prod" : "stag";
    //removing translate fn as  it wasn't being serialized properly when passed through Inngest
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
    await inngestClient.send({
      name: `booking/payment-reminder-${key}`,
      data: {
        evt: serializableEvt,
        booking: {
          user: booking.user,
          id: booking.id,
          startTime: booking.startTime,
          uid: booking.uid,
        },
        paymentData,
        eventTypeMetadata: selectedEventType?.metadata,
        bookingSeatId: bookingSeat?.id,
        // Include payment app credentials for afterPayment execution
        paymentAppCredentials: {
          key: paymentAppCredentials.key,
          appId: paymentAppCredentials.appId,
          appDirName: paymentAppCredentials.app?.dirName,
        },
      },
    });
  } catch (e) {
    console.error(e);
  }
  return paymentData;
};

export { handlePayment };
