import Script from "next/script";
import type { Tag } from "types";

import { getEventTypeAppData } from "@calcom/app-store/_utils/getEventTypeAppData";
import { appStoreMetadata } from "@calcom/app-store/bookerAppsMetaData";
import { sdkActionManager } from "@calcom/lib/sdk-event";
import type { AppMeta } from "@calcom/types/App";

import type { appDataSchemas } from "./apps.schemas.generated";

const PushEventPrefix = "cal_analytics_app_";

// AnalyticApp has appData.tag always set
type AnalyticApp = Omit<AppMeta, "appData"> & {
  appData: Omit<NonNullable<AppMeta["appData"]>, "tag"> & {
    tag: NonNullable<NonNullable<AppMeta["appData"]>["tag"]>;
  };
};

// Setup listener for all events to push to analytics apps
if (typeof window !== "undefined") {
  sdkActionManager?.on("*", (event) => {
    const { type: name, ...data } = event.detail;
    // Don't push internal events to analytics apps
    // They are meant for internal use like helping embed make some decisions
    if (name.startsWith("__")) {
      return;
    }
    Object.entries(window).forEach(([prop, value]) => {
      if (!prop.startsWith(PushEventPrefix) || typeof value !== "function") {
        return;
      }
      const pushEvent = window[prop as keyof typeof window];

      pushEvent({
        name,
        data,
      });
    });
  });
}
export default function BookingPageTagManager({
  eventType,
}: {
  eventType: Parameters<typeof getEventTypeAppData>[0];
}) {
  const analyticsApps = Object.entries(appStoreMetadata).reduce(
    (acc, entry) => {
      const [appId, app] = entry;
      const eventTypeAppData = getEventTypeAppData(eventType, appId as keyof typeof appDataSchemas);

      if (!eventTypeAppData || !app.appData?.tag) {
        return acc;
      }

      acc[appId] = {
        meta: app as AnalyticApp,
        eventTypeAppData: eventTypeAppData,
      };
      return acc;
    },
    {} as Record<
      string,
      {
        meta: AnalyticApp;
        eventTypeAppData: ReturnType<typeof getEventTypeAppData>;
      }
    >
  );

  return (
    <>
      {Object.entries(analyticsApps).map(([appId, { meta: app, eventTypeAppData }]) => {
        const tag = app.appData.tag;

        const parseValue = <T extends string | undefined>(val: T): T => {
          if (!val) {
            return val;
          }

          // Only support UpperCase,_and numbers in template variables. This prevents accidental replacement of other strings.
          const regex = /\{([A-Z_\d]+)\}/g;
          let matches;
          while ((matches = regex.exec(val))) {
            const variableName = matches[1];
            if (eventTypeAppData[variableName]) {
              // Replace if value is available. It can possible not be a template variable that just matches the regex.
              val = val.replace(
                new RegExp(`{${variableName}}`, "g"),
                eventTypeAppData[variableName]
              ) as NonNullable<T>;
            }
          }
          return val;
        };

        const pushEventScript = getPushEventScript({ tag, appId });
        return tag.scripts.concat(pushEventScript ? [pushEventScript] : []).map((script, index) => {
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

const getPushEventScript = ({ tag, appId }: { tag: Tag; appId: string }) => {
  if (!tag.pushEventScript) {
    return tag.pushEventScript;
  }
  return {
    ...tag.pushEventScript,
    content: tag.pushEventScript?.content?.replace("$pushEvent", `${PushEventPrefix}_${appId}`),
  };
};
