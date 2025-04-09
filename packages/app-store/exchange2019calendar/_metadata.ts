import type { AppMeta } from "@calcom/types/App";

import _package from "./package.json";

export const metadata = {
  name: "Microsoft Exchange 2019 Calendar",
  description: _package.description,
  installed: true,
  type: "exchange2019_calendar",
  title: "Microsoft Exchange 2019 Calendar",
  variant: "calendar",
  category: "calendar",
  categories: ["calendar"],
  label: "Exchange Calendar",
  logo: "icon.svg",
  publisher: "Cal.com",
  slug: "exchange2019-calendar",
  url: "https://cal.com/",
  email: "help@cal.com",
  dirName: "exchange2019calendar",
  isOAuth: false,
} as AppMeta;

export default metadata;
