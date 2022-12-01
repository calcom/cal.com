import { APP_NAME, SUPPORT_MAIL_ADDRESS } from "@calcom/lib/constants";
import type { AppMeta } from "@calcom/types/App";

export const metadata = {
  category: "analytics",
  "/*": "Don't modify slug - If required, do it using cli edit command",
  name: "Fathom",
  slug: "fathom",
  type: "fathom_analytics",
  imageSrc: "/api/app-store/fathom/icon.svg",
  logo: "/api/app-store/fathom/icon.svg",
  url: "https://cal.com/apps/fathom",
  variant: "analytics",
  categories: ["analytics"],
  publisher: APP_NAME,
  email: SUPPORT_MAIL_ADDRESS,
  extendsFeature: "EventType",
  description:
    "Fathom Analytics provides simple, privacy-focused website analytics. We're a GDPR-compliant, Google Analytics alternative.",
  __createdUsingCli: true,
} as AppMeta;

export default metadata;
