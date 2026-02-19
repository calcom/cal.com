import type { AppMeta } from "@calcom/types/App";

export const metadata = {
  name: "Exchange 2013",
  description: "For calendars hosted on on-premises Microsoft Exchange 2013 servers",
  installed: true,
  type: "exchange2013_calendar",
  title: "Exchange 2013",
  variant: "calendar",
  category: "calendar",
  categories: ["calendar"],
  label: "Exchange Calendar",
  logo: "icon.svg",
  publisher: "Cal.com",
  slug: "exchange2013-calendar",
  url: "https://cal.com/",
  email: "help@cal.com",
  dirName: "exchange2013calendar",
  isOAuth: false,
} as AppMeta;

export default metadata;
