import type { AppMeta } from "@calcom/types/App";

export const metadata = {
  name: "Outlook Calendar",
  description:
    "Microsoft Office 365 is a suite of apps that helps you stay connected with others and get things done. It includes but is not limited to Microsoft Word, PowerPoint, Excel, Teams, OneNote and OneDrive. Office 365 allows you to work remotely with others on a team and collaborate in an online environment. Both web versions and desktop/mobile applications are available.",
  type: "office365_calendar",
  title: "Outlook Calendar",
  variant: "calendar",
  category: "calendar",
  categories: ["calendar"],
  logo: "icon.svg",
  publisher: "Cal.com",
  slug: "office365-calendar",
  dirName: "office365calendar",
  url: "https://cal.com/",
  email: "help@cal.com",
  isOAuth: true,
} as AppMeta;

export default metadata;
