import type { AppMeta } from "@calcom/types/App";

export const metadata = {
  name: "Proton Calendar",
  description:
    "Proton Calendar is an end-to-end encrypted calendar from Proton. It supports CalDAV through Proton Bridge, allowing third-party clients to sync events while keeping all data encrypted on Proton's servers.",
  installed: true,
  type: "proton_calendar",
  title: "Proton Calendar",
  variant: "calendar",
  category: "calendar",
  categories: ["calendar"],
  logo: "icon.svg",
  publisher: "Cal.diy",
  slug: "proton-calendar",
  url: "https://proton.me/calendar",
  email: "help@cal.com",
  dirName: "protoncalendar",
  isOAuth: false,
} as AppMeta;

export default metadata;
