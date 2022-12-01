import { APP_NAME, SUPPORT_MAIL_ADDRESS } from "@calcom/lib/constants";
import type { AppMeta } from "@calcom/types/App";

export const metadata = {
  category: "other",
  "/*": "Don't modify slug - If required, do it using cli edit command",
  name: "Signal",
  slug: "signal",
  type: "signal_video",
  imageSrc: "/api/app-store/signal/icon.svg",
  logo: "/api/app-store/signal/icon.svg",
  url: "https://cal.com/apps/signal",
  variant: "conferencing",
  categories: ["video"],
  publisher: APP_NAME,
  email: SUPPORT_MAIL_ADDRESS,
  description: "Schedule a chat with your guests or have a Signal Video call.",
  extendsFeature: "User",
  __createdUsingCli: true,
  appData: {
    location: {
      type: "integrations:signal_video",
      label: "Signal",
      linkType: "static",
      organizerInputPlaceholder: "https://signal.me/#p/+11234567890",
      urlRegExp: "^http(s)?:\\/\\/(www\\.)?signal.me\\/[a-zA-Z0-9]*",
    },
  },
} as AppMeta;

export default metadata;
