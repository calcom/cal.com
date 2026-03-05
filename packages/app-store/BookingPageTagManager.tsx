import Script from "next/script";

import { getEventTypeAppData } from "@calcom/app-store/_utils/getEventTypeAppData";
import { appStoreMetadata } from "@calcom/app-store/bookerAppsMetaData";
import type { Tag } from "@calcom/app-store/types";
import { sdkActionManager } from "@calcom/lib/sdk-event";
import type { AppMeta } from "@calcom/types/App";

import type { appDataSchemas } from "./apps.schemas.generated";

const PushEventPrefix = "cal_analytics_app_";

/**
 * GTM Hardened Container: Restriction IDs for blocking dangerous execution types
 * and allowing only vetted, safe tracking templates.
 *
 * @see https://developers.google.com/tag-platform/tag-manager/restrict
 */
const GTM_RESTRICTIONS = {
  blocklist: [
    "customScripts", // Blocks Custom HTML and Custom JS variables
    "nonGoogleScripts", // Blocks scripts not hosted by Google
    "nonGoogleIframes", // Blocks injection of 3rd party iframes
  ],
  allowlist: [
    "google", // Allows GA4, Google Ads, and Floodlight
    "sandboxedScripts", // Allows vetted Community Templates (Meta, TikTok, LinkedIn, etc.)
    "cl", // Click Listener (Trigger)
    "evl", // Element Visibility (Trigger)
    "v", // Data Layer Variable
    "u", // URL Variable
  ],
};

/**
 * Generates the inline script content that initializes the dataLayer with
 * GTM type restrictions. This MUST run before the GTM container script loads.
 */
const GTM_BLOCKLIST_SCRIPT_CONTENT = `window.dataLayer=window.dataLayer||[];window.dataLayer.push({"gtm.blocklist":${JSON.stringify(GTM_RESTRICTIONS.blocklist)},"gtm.allowlist":${JSON.stringify(GTM_RESTRICTIONS.allowlist)}});`;

// AnalyticApp has appData.tag always set
type AnalyticApp = Omit<AppMeta, "appData"> & {
  appData: Omit<NonNullable<AppMeta["appData"]>, "tag"> & {
    tag: NonNullable<NonNullable<AppMeta["appData"]>["tag"]>;
  };
};

const getPushEventScript = ({ tag, appId }: { tag: Tag; appId: string }) => {
  if (!tag.pushEventScript) {
    return tag.pushEventScript;
  }

  return {
    ...tag.pushEventScript,
    // In case of complex pushEvent implementations, we could think about exporting a pushEvent function from the analytics app maybe but for now this should suffice
    content: tag.pushEventScript?.content?.replace("$pushEvent", `${PushEventPrefix}_${appId}`),
  };
};

function getAnalyticsApps(eventType: Parameters<typeof getEventTypeAppData>[0]) {
  return Object.entries(appStoreMetadata).reduce(
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
}

export function handleEvent(event: { detail: Record<string, unknown> & { type: string } }) {
  const { type: name, ...data } = event.detail;
  // Don't push internal events to analytics apps
  // They are meant for internal use like helping embed make some decisions
  if (name.startsWith("__")) {
    return false;
  }

  Object.entries(window).forEach(([prop, value]) => {
    if (!prop.startsWith(PushEventPrefix) || typeof value !== "function") {
      return;
    }
    // Find the pushEvent if defined by the analytics app
    const pushEvent = window[prop as keyof typeof window];

    pushEvent({
      name,
      data,
    });
  });

  // Support sending all events to opener which is currently used by ReroutingDialog to identify if the booking is successfully rescheduled.
  if (window.opener) {
    window.opener.postMessage(
      {
        type: `CAL:${name}`,
        ...data,
      },
      "*"
    );
  }
  return true;
}

export default function BookingPageTagManager({
  eventType,
}: {
  eventType: Parameters<typeof getEventTypeAppData>[0];
}) {
  const analyticsApps = getAnalyticsApps(eventType);
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
        const isGtmApp = appId === "gtm";
        return (isGtmApp ? [{ content: GTM_BLOCKLIST_SCRIPT_CONTENT }] : [])
          .concat(tag.scripts)
          .concat(pushEventScript ? [pushEventScript] : [])
          .map((script, index) => {
          const parsedAttributes: NonNullable<(typeof tag.scripts)[number]["attrs"]> = {};
          const attrs = script.attrs || {};
          Object.entries(attrs).forEach(([name, value]) => {
            if (typeof value === "string") {
              value = parseValue(value);
            }
            parsedAttributes[name] = value;
          });

          return (
            // biome-ignore lint/security/noDangerouslySetInnerHtml: Analytics script injection
            <Script
              data-testid={`cal-analytics-app-${appId}`}
              src={parseValue(script.src)}
              id={`${appId}-${index}`}
              key={`${appId}-${index}`}
              // It is strictly not necessary to disable, but in a future update of react/no-danger this will error.
              // And we don't want it to error here anyways
              // eslint-disable-next-line react/no-danger
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

if (typeof window !== "undefined") {
  // Attach listener outside React as it has to be attached only once per page load
  // Setup listener for all events to push to analytics apps
  sdkActionManager?.on("*", handleEvent);
}
