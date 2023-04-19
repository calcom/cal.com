import type { z } from "zod";

import type { EventTypeModel } from "@calcom/prisma/zod";
import type { EventTypeMetaDataSchema } from "@calcom/prisma/zod-utils";

export type EventTypeApps = NonNullable<NonNullable<z.infer<typeof EventTypeMetaDataSchema>>["apps"]>;
export type EventTypeAppsList = keyof EventTypeApps;

export const getEventTypeAppData = <T extends EventTypeAppsList>(
  eventType: Pick<z.infer<typeof EventTypeModel>, "price" | "currency" | "metadata">,
  appId: T,
  forcedGet?: boolean
): EventTypeApps[T] => {
  const metadata = eventType.metadata;
  const appMetadata = metadata?.apps && metadata.apps[appId];
  if (appMetadata) {
    const allowDataGet = forcedGet ? true : appMetadata.enabled;
    return allowDataGet
      ? {
          ...appMetadata,
          // trackingId is legacy way to store value for TRACKING_ID. So, we need to support both.
          TRACKING_ID: appMetadata.TRACKING_ID || appMetadata.trackingId,
        }
      : null;
  }

  // Backward compatibility for existing event types.
  // TODO: After the new AppStore EventType App flow is stable, write a migration to migrate metadata to new format which will let us remove this compatibility code
  // Migration isn't being done right now, to allow a revert if needed
  const legacyAppsData = {
    stripe: {
      enabled: eventType.price > 0,
      // Price default is 0 in DB. So, it would always be non nullish.
      price: eventType.price,
      // Currency default is "usd" in DB.So, it would also be available always
      currency: eventType.currency,
      paymentOption: "ON_BOOKING",
    },
    rainbow: {
      enabled: !!(eventType.metadata?.smartContractAddress && eventType.metadata?.blockchainId),
      smartContractAddress: eventType.metadata?.smartContractAddress || "",
      blockchainId: eventType.metadata?.blockchainId || 0,
    },
    giphy: {
      enabled: !!eventType.metadata?.giphyThankYouPage,
      thankYouPage: eventType.metadata?.giphyThankYouPage || "",
    },
  } as const;

  // TODO: This assertion helps typescript hint that only one of the app's data can be returned
  const legacyAppData = legacyAppsData[appId as Extract<T, keyof typeof legacyAppsData>];
  const allowDataGet = forcedGet ? true : legacyAppData?.enabled;
  return allowDataGet ? legacyAppData : null;
};
