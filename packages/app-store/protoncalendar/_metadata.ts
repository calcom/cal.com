import type { AppMeta } from "@calcom/types/App";

export const metadata = {
  name: "Proton Calendar",
  description:
    "Proton Calendar is a secure, encrypted calendar service by Proton. Connect your Proton Calendar to Cal.com via read-only ICS feed for availability checking.",
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
  dirName: "protoncalendar",
  isOAuth: false,
  isGlobal: false,
} as AppMeta;

export default metadata;
