import type { z } from "zod";

import type { EventTypeMetaDataSchema } from "@calcom/prisma/zod-utils";

import type { appDataSchemas } from "../../apps.schemas.generated";
import type { appDataSchema, paymentOptionEnum } from "../../stripepayment/zod";
import type { EventTypeAppsList } from "../../utils";
import { eventTypeMetaDataSchemaWithTypedApps } from "../../zod-utils";
import { getEventTypeAppData } from "../getEventTypeAppData";

export function getPaymentAppData(
  _eventType: {
    price: number;
    currency: string;
    metadata: z.infer<typeof EventTypeMetaDataSchema>;
  },
  forcedGet?: boolean
) {
  const eventType = {
    ..._eventType,
    metadata: eventTypeMetaDataSchemaWithTypedApps.parse(_eventType.metadata),
  };
  const metadataApps = eventType.metadata?.apps;
  if (!metadataApps) {
    return {
      enabled: false,
      price: 0,
      currency: "usd",
      appId: null,
      paymentOption: "ON_BOOKING" as const,
      credentialId: undefined,
      refundPolicy: undefined,
      refundDaysCount: undefined,
      refundCountCalendarDays: undefined,
    };
  }
  type appId = keyof typeof metadataApps;
  // @TODO: a lot of unknowns types here can be improved later
  const paymentAppIds = (Object.keys(metadataApps) as Array<keyof typeof appDataSchemas>).filter(
    (app) =>
      (metadataApps[app as appId] as unknown as z.infer<typeof appDataSchema>)?.price &&
      (metadataApps[app as appId] as unknown as z.infer<typeof appDataSchema>)?.enabled
  );

  // Event type should only have one payment app data
  let paymentAppData: {
    enabled: boolean;
    price: number;
    currency: string;
    appId: EventTypeAppsList | null;
    paymentOption: z.infer<typeof paymentOptionEnum>;
    credentialId?: number;
    refundPolicy?: string;
    refundDaysCount?: number;
    refundCountCalendarDays?: boolean;
  } | null = null;
  for (const appId of paymentAppIds) {
    const appData = getEventTypeAppData(eventType, appId, forcedGet);
    if (appData && paymentAppData === null) {
      const data = appData as { enabled?: boolean; price?: number; currency?: string; paymentOption?: string; credentialId?: number; refundPolicy?: string; refundDaysCount?: number; refundCountCalendarDays?: boolean };
      paymentAppData = {
        enabled: data.enabled ?? false,
        price: data.price ?? 0,
        currency: data.currency ?? "usd",
        paymentOption: (data.paymentOption ?? "ON_BOOKING") as z.infer<typeof paymentOptionEnum>,
        credentialId: data.credentialId,
        refundPolicy: data.refundPolicy,
        refundDaysCount: data.refundDaysCount,
        refundCountCalendarDays: data.refundCountCalendarDays,
        appId,
      };
    }
  }
  // This is the current expectation of system to have price and currency set always(using DB Level defaults).
  // Newly added apps code should assume that their app data might not be set.
  return (
    paymentAppData || {
      enabled: false,
      price: 0,
      currency: "usd",
      appId: null,
      paymentOption: "ON_BOOKING",
      credentialId: undefined,
      refundPolicy: undefined,
      refundDaysCount: undefined,
      refundCountCalendarDays: undefined,
    }
  );
}

export type PaymentAppData = ReturnType<typeof getPaymentAppData>;
