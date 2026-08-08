import type { AppMeta } from "@calcom/types/App";

export const metadata = {
  name: "Proton Calendar",
  description:
    "Proton Calendar is a privacy-focused calendar service. Sync your Cal.com bookings seamlessly with Proton Calendar via CalDAV.",
  installed: true,
  type: "proton_calendar",
  title: "Proton Calendar",
  variant: "calendar",
  category: "calendar",
  categories: ["calendar"],
  logo: "icon.svg",
  publisher: "Cal.com",
  slug: "proton-calendar",
  url: "https://proton.me/calendar",
  email: "help@cal.com",
  dirName: "proton",
  isOAuth: false,
} as AppMeta;

export default metadata;
