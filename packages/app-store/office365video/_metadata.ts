import type { AppMeta } from "@calcom/types/App";

export const metadata = {
  name: "Microsoft 365/Teams (Requires work/school account)",
  description:
    "Microsoft Teams is a business communication platform and collaborative workspace included in Microsoft 365. It offers workspace chat and video conferencing, file storage, and application integration. Both web versions and desktop/mobile applications are available. NOTE: MUST HAVE A WORK / SCHOOL ACCOUNT",
  appData: {
    location: {
      linkType: "dynamic",
      type: "integrations:office365_video",
      label: "MS Teams (Requires work/school account)",
    },
  },
  type: "office365_video",
  title: "MS Teams (Requires work/school account)",
  variant: "conferencing",
  category: "conferencing",
  categories: ["conferencing"],
  logo: "icon.svg",
  publisher: "Cal.com",
  slug: "msteams",
  dirName: "office365video",
  url: "https://www.microsoft.com/en-ca/microsoft-teams/group-chat-software",
  email: "help@cal.com",
  isOAuth: true,
} as AppMeta;

export default metadata;
