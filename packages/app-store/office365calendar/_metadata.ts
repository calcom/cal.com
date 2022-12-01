import { APP_NAME, SUPPORT_MAIL_ADDRESS } from "@calcom/lib/constants";
import type { AppMeta } from "@calcom/types/App";

import _package from "./package.json";

export const metadata = {
  name: "Outlook Calendar",
  description: _package.description,
  type: "office365_calendar",
  title: "Outlook Calendar",
  imageSrc: "/api/app-store/office365calendar/icon.svg",
  variant: "calendar",
  category: "calendar",
  logo: "/api/app-store/office365calendar/icon.svg",
  publisher: APP_NAME,
  rating: 5,
  reviews: 69,
  slug: "office365-calendar",
  trending: false,
  url: "https://cal.com/",
  verified: true,
  email: SUPPORT_MAIL_ADDRESS,
} as AppMeta;

export default metadata;
