import type { AppMeta } from "@calcom/types/App";

import _package from "./package.json";

export const metadata = {
  name: "Lark Calendar",
  description: _package.description,
  installed: true,
  type: "lark_calendar",
  title: "Lark Calendar",
  variant: "calendar",
  categories: ["calendar"],
  logo: "icon.svg",
  publisher: "Lark",
  rating: 5,
  reviews: 69,
  slug: "lark-calendar",
  trending: false,
  url: "https://larksuite.com/",
  verified: true,
  email: "alan@larksuite.com",
  dirName: "larkcalendar",
} as AppMeta;

export default metadata;
