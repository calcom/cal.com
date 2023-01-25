import { EventTypeAppsList, getEventTypeAppData } from "@calcom/app-store/utils";

export default function getPaymentAppData(
  eventType: Parameters<typeof getEventTypeAppData>[0],
  forcedGet?: boolean
) {
  const metadataApps = eventType?.metadata?.apps;
  if (!metadataApps) {
    return { enabled: false, price: 0, currency: "usd", appId: null };
  }

  const paymentAppIds = Object.keys(metadataApps).filter(
    (app) => metadataApps[app]?.price && metadataApps[app]?.enabled
  );

  // Event type should only have one payment app data
  let paymentAppData: {
    enabled: boolean;
    price: number;
    currency: string;
    appId: EventTypeAppsList | null;
  } | null = null;
  for (const appId of paymentAppIds) {
    const appData = getEventTypeAppData(eventType, appId, forcedGet);
    if (appData && paymentAppData === null) {
      paymentAppData = {
        ...appData,
        appId,
      };
    }
  }
  // This is the current expectation of system to have price and currency set always(using DB Level defaults).
  // Newly added apps code should assume that their app data might not be set.
  return paymentAppData || { enabled: false, price: 0, currency: "usd", appId: null };
}
