import { APP_NAME, SUPPORT_MAIL_ADDRESS } from "@calcom/lib/constants";
import { AppMeta } from "@calcom/types/App";

export const metadata = {
  category: "calendar",
  installed: true,
  rating: 0,
  reviews: 0,
  trending: true,
  verified: true,
  "/*": "Don't modify slug - If required, do it using cli edit command",
  title: "Microsoft Exchange",
  name: "Microsoft Exchange",
  slug: "exchange",
  type: "exchange_calendar",
  imageSrc: "/api/app-store/exchangecalendar/icon.svg",
  logo: "/api/app-store/exchangecalendar/icon.svg",
  url: "https://cal.com/apps/exchange",
  variant: "calendar",
  categories: ["calendar"],
  publisher: APP_NAME,
  email: SUPPORT_MAIL_ADDRESS,
  description: "Fetch Microsoft Exchange calendars and availabilities using Exchange Web Services (EWS).",
  __createdUsingCli: true,
} as AppMeta;

export default metadata;
