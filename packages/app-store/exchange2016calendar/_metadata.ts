import type { AppMeta } from "@calcom/types/App";

export const metadata = {
  name: "Exchange 2016",
  description: "For calendars hosted on on-premises Microsoft Exchange 2016 servers",
  installed: true,
  type: "exchange2016_calendar",
  title: "Exchange 2016",
  variant: "calendar",
  category: "calendar",
  categories: ["calendar"],
  label: "Exchange Calendar",
  logo: "icon.svg",
  publisher: "Cal.com",
  slug: "exchange2016-calendar",
  url: "https://cal.com/",
  email: "help@cal.com",
  dirName: "exchange2016calendar",
  isOAuth: false,
} as AppMeta;

export default metadata;
