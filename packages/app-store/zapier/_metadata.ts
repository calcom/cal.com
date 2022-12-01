import { APP_NAME, SUPPORT_MAIL_ADDRESS } from "@calcom/lib/constants";
import type { AppMeta } from "@calcom/types/App";

import _package from "./package.json";

export const metadata = {
  name: "Zapier",
  description: _package.description,
  installed: true,
  category: "automation",
  imageSrc: "/api/app-store/zapier/icon.svg",
  logo: "/api/app-store/zapier/icon.svg",
  publisher: APP_NAME,
  rating: 0,
  reviews: 0,
  slug: "zapier",
  title: "Zapier",
  trending: true,
  type: "zapier_automation",
  url: "https://cal.com/apps/zapier",
  variant: "automation",
  verified: true,
  email: SUPPORT_MAIL_ADDRESS,
} as AppMeta;

export default metadata;
