import type { App } from "@calcom/types/App";

import _package from "./package.json";

export const metadata = {
  name: "Lark Calendar",
  description: _package.description,
  installed: true,
  type: "lark_calendar",
  title: "Lark Calendar",
  imageSrc: "/api/app-store/larkcalendar/icon.svg",
  variant: "calendar",
  category: "calendar",
  logo: "/api/app-store/larkcalendar/icon.svg",
  publisher: "Cal.com",
  rating: 5,
  reviews: 69,
  slug: "lark-calendar",
  trending: false,
  url: "https://cal.com/",
  verified: true,
  email: "help@cal.com",
} as App;

export default metadata;
