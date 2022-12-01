import { APP_NAME, SUPPORT_MAIL_ADDRESS } from "@calcom/lib/constants";
import type { AppMeta } from "@calcom/types/App";

import _package from "./package.json";

export const metadata = {
  name: "Apple Calendar",
  description: _package.description,
  installed: true,
  type: "apple_calendar",
  title: "Apple Calendar",
  imageSrc: "/api/app-store/applecalendar/icon.svg",
  variant: "calendar",
  category: "calendar",
  logo: "/api/app-store/applecalendar/icon.svg",
  publisher: APP_NAME,
  rating: 5,
  reviews: 69,
  slug: "apple-calendar",
  trending: false,
  url: "https://cal.com/",
  verified: true,
  email: SUPPORT_MAIL_ADDRESS,
} as AppMeta;

export default metadata;
