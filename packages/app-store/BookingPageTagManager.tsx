import Script from "next/script";

import { appStoreMetadata } from "@calcom/app-store/appStoreMetaData";
import { getEventTypeAppData } from "@calcom/app-store/utils";

import { appDataSchemas } from "./apps.schemas.generated";

export default function BookingPageTagManager({
  eventType,
}: {
  eventType: Parameters<typeof getEventTypeAppData>[0];
}) {
  return (
    <>
      {Object.entries(appStoreMetadata).map(([appId, app]) => {
        const tag = app.appData?.tag;
        if (!tag) {
          return null;
        }
        const trackingId = getEventTypeAppData(eventType, appId as keyof typeof appDataSchemas)?.trackingId;
        if (!trackingId) {
          return null;
        }
        const parseValue = <T extends string | undefined>(val: T): T =>
          val ? (val.replace(/\{TRACKING_ID\}/g, trackingId) as T) : val;

        return tag.scripts.map((script, index) => {
          const parsedAttributes: NonNullable<typeof tag.scripts[number]["attrs"]> = {};
          const attrs = script.attrs || {};
          Object.entries(attrs).forEach(([name, value]) => {
            if (typeof value === "string") {
              value = parseValue(value);
            }
            parsedAttributes[name] = value;
          });

          return (
            <Script
              src={parseValue(script.src)}
              id={`${appId}-${index}`}
              key={`${appId}-${index}`}
              dangerouslySetInnerHTML={{
                __html: parseValue(script.content) || "",
              }}
              {...parsedAttributes}
              defer
            />
          );
        });
      })}
    </>
  );
}
