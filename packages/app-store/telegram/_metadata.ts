import { APP_NAME, SUPPORT_MAIL_ADDRESS } from "@calcom/lib/constants";
import type { AppMeta } from "@calcom/types/App";

export const metadata = {
  category: "other",
  "/*": "Don't modify slug - If required, do it using cli edit command",
  name: "Telegram",
  slug: "telegram",
  type: "telegram_video",
  imageSrc: "/api/app-store/telegram/icon.svg",
  logo: "/api/app-store/telegram/icon.svg",
  url: "https://cal.com/apps/telegram",
  variant: "conferencing",
  categories: ["video"],
  publisher: APP_NAME,
  email: SUPPORT_MAIL_ADDRESS,
  description: "Schedule a chat with your guests or have a Telegram Video call.",
  extendsFeature: "User",
  __createdUsingCli: true,
  appData: {
    location: {
      type: "integrations:telegram_video",
      label: "Telegram",
      linkType: "static",
      organizerInputPlaceholder: "https://t.me/MyUsername",
      urlRegExp: "^http(s)?:\\/\\/(www\\.)?t.me\\/[a-zA-Z0-9]*",
    },
  },
} as AppMeta;

export default metadata;
