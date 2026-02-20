import type { AppMeta } from "@calcom/types/App";

export const metadata = {
  name: "Lark Calendar",
  description:
    "Lark Calendar is a time management and scheduling service developed by Lark. Allows users to create and edit events, with options available for type and time. Available to anyone that has a Lark account on both mobile and web versions.",
  installed: true,
  type: "lark_calendar",
  title: "Lark Calendar",
  variant: "calendar",
  categories: ["calendar"],
  logo: "icon.svg",
  publisher: "Lark",
  slug: "lark-calendar",
  url: "https://larksuite.com/",
  email: "alan@larksuite.com",
  dirName: "larkcalendar",
  isOAuth: true,
} as AppMeta;

export default metadata;
