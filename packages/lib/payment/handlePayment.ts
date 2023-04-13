import type { AppCategories, Prisma } from "@prisma/client";

import appStore from "@calcom/app-store";
import type { EventTypeAppsList } from "@calcom/app-store/utils";
import type { EventTypeModel } from "@calcom/prisma/zod";
import type { CalendarEvent } from "@calcom/types/Calendar";

const handlePayment = async (
  evt: CalendarEvent,
  selectedEventType: Pick<Zod.infer<typeof EventTypeModel>, "metadata">,
  paymentAppCredentials: {
    key: Prisma.JsonValue;
    appId: EventTypeAppsList;
    app: {
      dirName: string;
      categories: AppCategories[];
    } | null;
  },
  booking: {
    user: { email: string | null; name: string | null; timeZone: string } | null;
    id: number;
    startTime: { toISOString: () => string };
    uid: string;
  },
  bookerEmail: string
) => {
  const paymentApp = await appStore[paymentAppCredentials?.app?.dirName as keyof typeof appStore];
  if (!(paymentApp && "lib" in paymentApp && "PaymentService" in paymentApp.lib)) {
    console.warn(`payment App service of type ${paymentApp} is not implemented`);
    return null;
  }
  const PaymentService = paymentApp.lib.PaymentService;
  const paymentInstance = new PaymentService(paymentAppCredentials);

  const paymentOption =
    selectedEventType?.metadata?.apps?.[paymentAppCredentials.appId].paymentOption || "ON_BOOKING";

  let paymentData;
  if (paymentOption === "HOLD") {
    paymentData = await paymentInstance.collectCard(
      {
        amount: selectedEventType?.metadata?.apps?.[paymentAppCredentials.appId].price,
        currency: selectedEventType?.metadata?.apps?.[paymentAppCredentials.appId].currency,
      },
      booking.id,
      bookerEmail,
      paymentOption
    );
  } else {
    paymentData = await paymentInstance.create(
      {
        amount: selectedEventType?.metadata?.apps?.[paymentAppCredentials.appId].price,
        currency: selectedEventType?.metadata?.apps?.[paymentAppCredentials.appId].currency,
      },
      booking.id,
      bookerEmail,
      paymentOption
    );
  }

  if (!paymentData) {
    console.error("Payment data is null");
    throw new Error("Payment data is null");
  }
  try {
    await paymentInstance.afterPayment(evt, booking, paymentData);
  } catch (e) {
    console.error(e);
  }
  return paymentData;
};

export { handlePayment };
