import Script from "next/script";

import { getEventTypeAppData } from "@calcom/app-store/_utils/getEventTypeAppData";
import { appStoreMetadata } from "@calcom/app-store/bookerAppsMetaData";

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

        if (!appData) {
          return null;
        }

        const parseValue = <T extends string | undefined>(val: T): T => {
          if (!val) {
            return val;
          }

          // Only support UpperCase,_and numbers in template variables. This prevents accidental replacement of other strings.
          const regex = /\{([A-Z_\d]+)\}/g;
          let matches;
          while ((matches = regex.exec(val))) {
            const variableName = matches[1];
            if (appData[variableName]) {
              // Replace if value is available. It can possible not be a template variable that just matches the regex.
              val = val.replace(
                new RegExp(`{${variableName}}`, "g"),
                appData[variableName]
              ) as NonNullable<T>;
            }
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
