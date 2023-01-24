import { PaymentType } from "@prisma/client";

import { EventTypeAppsList, getEventTypeAppData } from "@calcom/app-store/utils";

export default function getPaymentAppData(
  eventType: Parameters<typeof getEventTypeAppData>[0],
  forcedGet?: boolean
) {
  const paymentProviders = Object.values(PaymentType).map(
    (value) => value.toLowerCase() as EventTypeAppsList
  );

  // Event type should only have one payment app data
  let paymentAppData: {
    enabled: boolean;
    price: number;
    currency: string;
    appId: EventTypeAppsList | null;
  } | null = null;
  for (const paymentProvider of paymentProviders) {
    const appData = getEventTypeAppData(eventType, paymentProvider, forcedGet);
    if (appData && paymentAppData === null) {
      paymentAppData = {
        ...appData,
        appId: paymentProvider,
      };
    }
  }
  // This is the current expectation of system to have price and currency set always(using DB Level defaults).
  // Newly added apps code should assume that their app data might not be set.
  return paymentAppData || { enabled: false, price: 0, currency: "usd", appId: null };
}
