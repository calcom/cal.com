import type { AppMeta } from "@calcom/types/App";

import _package from "./package.json";

export const metadata = {
  name: "Microsoft Exchange 2016 Calendar",
  description: _package.description,
  installed: true,
  type: "exchange2016_calendar",
  title: "Microsoft Exchange 2016 Calendar",
  imageSrc: "/api/app-store/exchange2016calendar/icon.svg",
  variant: "calendar",
  category: "calendar",
  categories: ["calendar"],
  label: "Exchange Calendar",
  logo: "/api/app-store/exchange2016calendar/icon.svg",
  publisher: "Cal.com",
  slug: "exchange2016-calendar",
  url: "https://cal.com/",
  email: "help@cal.com",
  dirName: "exchange2016calendar",
} as AppMeta;

export default metadata;
