import { APP_NAME, SUPPORT_MAIL_ADDRESS } from "@calcom/lib/constants";
import type { AppMeta } from "@calcom/types/App";

import _package from "./package.json";

export const metadata = {
  name: "Microsoft 365/Teams (Requires work/school account)",
  description: _package.description,
  type: "office365_video",
  imageSrc: "/api/app-store/office365video/icon.svg",
  variant: "conferencing",
  logo: "/api/app-store/office365video/icon.svg",
  publisher: APP_NAME,
  url: "https://www.microsoft.com/en-ca/microsoft-teams/group-chat-software",
  verified: true,
  rating: 4.3, // TODO: placeholder for now, pull this from TrustPilot or G2
  reviews: 69, // TODO: placeholder for now, pull this from TrustPilot or G2
  category: "video",
  slug: "msteams",
  title: "MS Teams (Requires work/school account)",
  trending: true,
  email: SUPPORT_MAIL_ADDRESS,
  appData: {
    location: {
      linkType: "dynamic",
      type: "integrations:office365_video",
      label: "MS Teams",
    },
  },
} as AppMeta;

export default metadata;
