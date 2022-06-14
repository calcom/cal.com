import type { App } from "@calcom/types/App";

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
  label: "Exchange Calendar",
  logo: "/api/app-store/exchange2016calendar/icon.svg",
  publisher: "Cal.com",
  rating: 5,
  reviews: 69,
  slug: "exchange2016-calendar",
  trending: false,
  url: "https://cal.com/",
  verified: true,
  email: "help@cal.com",
} as App;

export default metadata;
