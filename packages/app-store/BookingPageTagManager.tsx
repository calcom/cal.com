import Script from "next/script";

import { getEventTypeAppData } from "@calcom/app-store/_utils/getEventTypeAppData";
import { appStoreMetadata } from "@calcom/app-store/appStoreMetaData";

import type { appDataSchemas } from "./apps.schemas.generated";

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

        const appData = getEventTypeAppData(eventType, appId as keyof typeof appDataSchemas);

        // We assume that the first variable(which is trackingId) is a required field. Every analytics app would have atleast one variable
        if (!appData?.variable1) {
          return null;
        }

        const parseValue = <T extends string | undefined>(val: T): T => {
          if (!val) {
            return val;
          }

          const regex = /\{([^}]+)\}/g;
          let matches;
          while ((matches = regex.exec(val))) {
            const variableName = matches[1];
            val = val.replace(new RegExp(`{${variableName}}`, "g"), appData[variableName]) as NonNullable<T>;
          }
          return val;
        };

        return tag.scripts.map((script, index) => {
          const parsedAttributes: NonNullable<(typeof tag.scripts)[number]["attrs"]> = {};
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
