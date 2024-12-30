import type { AppCategories, Prisma } from "@prisma/client";

import appStore from "@calcom/app-store";
import type { EventTypeAppsList } from "@calcom/app-store/utils";
import type { CompleteEventType } from "@calcom/prisma/zod";
import { eventTypeAppMetadataOptionalSchema } from "@calcom/prisma/zod-utils";
import type { CalendarEvent } from "@calcom/types/Calendar";
import type { IAbstractPaymentService, PaymentApp } from "@calcom/types/PaymentService";

const handlePayment = async ({
  evt,
  selectedEventType,
  paymentAppCredentials,
  booking,
  bookerName,
  bookerEmail,
  bookerPhoneNumber,
  isDryRun = false,
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
}) => {
  if (isDryRun) return null;
  const paymentApp = (await appStore[
    paymentAppCredentials?.app?.dirName as keyof typeof appStore
  ]?.()) as PaymentApp;
  if (!paymentApp?.lib?.PaymentService) {
    console.warn(`payment App service of type ${paymentApp} is not implemented`);
    return null;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const PaymentService = paymentApp.lib.PaymentService as any;

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
      bookerPhoneNumber,
      selectedEventType.title,
      evt.title
    );
  }

  if (!paymentData) {
    console.error("Payment data is null");
    throw new Error("Payment data is null");
  }
  try {
    await paymentInstance.afterPayment(evt, booking, paymentData, selectedEventType?.metadata);
  } catch (e) {
    console.error(e);
  }
  return paymentData;
};

export { handlePayment };
