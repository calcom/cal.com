import Script from "next/script";

import { getEventTypeAppData } from "@calcom/app-store/utils";

type AppScript = {attrs?: Record<string, string>, content?: string}
const trackingApps: Record<string, {
  scripts: AppScript[]
}> = {
  fathom: {
    scripts: [
      {
        attrs: {
          src: "https://cdn.usefathom.com/script.js",
          "data-site": "{TRACKING_ID}",
        },
      },
    ],
  },
  ga4: {
    scripts: [
      {
        attrs: {
          src: "https://www.googletagmanager.com/gtag/js?id={TRACKING_ID}",
        },
      },
      {
        content: `
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', '{TRACKING_ID}');
      `,
      },
    ],
  },
};

export default function BookingPageTagManager({
  eventType,
}: {
  eventType: Parameters<typeof getEventTypeAppData>[0];
}) {
  return (
    <>
      {Object.entries(trackingApps).map(([appId, scriptConfig]) => {
        const trackingId = getEventTypeAppData(eventType, appId)?.trackingId;
        if (!trackingId) {
          return null;
        }
        return scriptConfig.scripts.map((script, index)=>{
          const parsedScript: AppScript = {};
          const attrs = script.attrs || {};
          Object.entries(attrs).forEach(([name, value]) => {
            if (typeof value === "string") {
              value = value.replace(/\{TRACKING_ID\}/g, trackingId);
            }
            parsedScript[name] = value;
          });
  
          const dangerouslySetInnerHTML = script.content
            ? {
                __html: script.content.replace(/\{TRACKING_ID\}/g, trackingId),
              }
            : null;
  
          return <Script key={`${appId}-${index}`} {...{dangerouslySetInnerHTML, ...parsedScript}} defer />;
        })
      })}
    </>
  );
}
