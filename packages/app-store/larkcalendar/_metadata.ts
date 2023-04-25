import type { AppMeta } from "@calcom/types/App";

import _package from "./package.json";

export const metadata = {
  name: "Lark Calendar",
  description: _package.description,
  installed: true,
  type: "lark_calendar",
  title: "Lark Calendar",
  imageSrc: "/api/app-store/larkcalendar/icon.svg",
  variant: "calendar",
  categories: ["calendar"],
  logo: "/api/app-store/larkcalendar/icon.svg",
  publisher: "Lark",
  slug: "lark-calendar",
  url: "https://larksuite.com/",
  email: "alan@larksuite.com",
  dirName: "larkcalendar",
} as AppMeta;

export default metadata;
