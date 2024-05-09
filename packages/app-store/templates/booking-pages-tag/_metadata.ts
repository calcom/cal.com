import type { AppMeta } from "@calcom/types/App";

export const metadata = {
  name: "Booking Pages Tag",
  slug: "booking-pages-tag",
  type: "booking-pages-tag_analytics",
  logo: "icon.svg",
  url: "https://example.com/link",
  variant: "analytics",
  categories: ["analytics"],
  publisher: "Cal.com, Inc.",
  email: "support@cal.com",
  description: "It is a template demoing a Booking Pages tracking app like GA4, Fathom and Plausible.",
  extendsFeature: "EventType",
  appData: {
    tag: {
      scripts: [
        {
          src: "https://cdn.example.com/script.js",
          attrs: {
            "data-site": "{TRACKING_ID}",
          },
        },
      ],
    },
  },
  isTemplate: true,
  __createdUsingCli: true,
} as AppMeta;
