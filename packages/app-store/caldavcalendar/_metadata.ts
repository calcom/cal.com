import type { AppMeta } from "@calcom/types/App";

export const metadata = {
  name: "CalDav (Beta)",
  description:
    "Caldav is a protocol that allows different clients/servers to access scheduling information on remote servers as well as schedule meetings with other users on the same server or other servers. It extends WebDAV specification and uses iCalendar format for the data.",
  installed: true,
  type: "caldav_calendar",
  title: "CalDav (Beta)",
  variant: "calendar",
  category: "calendar",
  categories: ["calendar"],
  logo: "icon.svg",
  publisher: "Cal.com",
  slug: "caldav-calendar",
  url: "https://cal.com/",
  email: "help@cal.com",
  dirName: "caldavcalendar",
  isOAuth: false,
} as AppMeta;

export default metadata;
