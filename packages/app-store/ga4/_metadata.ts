import { APP_NAME, SUPPORT_MAIL_ADDRESS } from "@calcom/lib/constants";
import type { AppMeta } from "@calcom/types/App";

export const metadata = {
  category: "other",
  "/*": "Don't modify slug - If required, do it using cli edit command",
  name: "Google Analytics",
  slug: "ga4",
  type: "ga4_analytics",
  imageSrc: "/api/app-store/ga4/icon.svg",
  logo: "/api/app-store/ga4/icon.svg",
  url: "https://marketingplatform.google.com",
  variant: "analytics",
  categories: ["analytics"],
  publisher: APP_NAME,
  email: SUPPORT_MAIL_ADDRESS,
  description:
    "Google Analytics is a web analytics service offered by Google that tracks and reports website traffic, currently as a platform inside the Google Marketing Platform brand.",
  extendsFeature: "EventType",
  __createdUsingCli: true,
} as AppMeta;

export default metadata;
