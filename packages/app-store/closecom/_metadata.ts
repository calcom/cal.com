import { APP_NAME, SUPPORT_MAIL_ADDRESS } from "@calcom/lib/constants";
import type { AppMeta } from "@calcom/types/App";

export const metadata = {
  category: "other",
  // FIXME: Currently for an app to be shown as installed, it must have this variable set. Either hardcoded or if it depends on some env variable, that should be checked here
  installed: true,
  rating: 0,
  reviews: 0,
  trending: true,
  verified: true,
  licenseRequired: true,
  isProOnly: true,
  "/*": "Don't modify slug - If required, do it using cli edit command",
  name: "Close.com",
  title: "Close.com",
  slug: "closecom",
  type: "closecom_other_calendar",
  imageSrc: "/api/app-store/closecom/icon.svg",
  logo: "/api/app-store/closecom/icon.svg",
  url: "https://cal.com/apps/closecom",
  variant: "other",
  categories: ["other"],
  publisher: APP_NAME,
  email: SUPPORT_MAIL_ADDRESS,
  description:
    "Close is the inside sales CRM of choice for startups and SMBs. Make more calls, send more emails and close more deals starting today.",
  __createdUsingCli: true,
} as AppMeta;

export default metadata;
