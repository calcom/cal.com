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
  name: "Routing Forms",
  title: "Routing Forms",
  slug: "routing-forms",
  type: "routing-forms_other",
  imageSrc: "/api/app-store/ee/routing-forms/icon.svg",
  logo: "/api/app-store/ee/routing-forms/icon.svg",
  url: "https://cal.com/apps/routing-forms",
  variant: "other",
  categories: ["other"],
  publisher: APP_NAME,
  email: SUPPORT_MAIL_ADDRESS,
  description:
    "It would allow a booker to connect with the right person or choose the right event, faster. It would work by taking inputs from the booker and using that data to route to the correct booker/event as configured by Cal user",
  __createdUsingCli: true,
} as AppMeta;

export default metadata;
