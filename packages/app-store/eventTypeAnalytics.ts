import { AppScript } from "./BookingPageTagManager";
import { appDataSchemas } from "./apps.schemas.generated";

// TODO: This config might be imported from {APP}/eventTypeAnalytics.ts.
export const trackingApps: Partial<
  Record<
    keyof typeof appDataSchemas,
    {
      scripts: AppScript[];
    }
  >
> = {
  fathom: {
    scripts: [
      {
        src: "https://cdn.usefathom.com/script.js",
        content: undefined,
        attrs: {
          "data-site": "{TRACKING_ID}",
        },
      },
    ],
  },
  ga4: {
    scripts: [
      {
        src: "https://www.googletagmanager.com/gtag/js?id={TRACKING_ID}",
        content: undefined,
        attrs: {},
      },
      {
        src: undefined,
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
