import { APP_NAME, SUPPORT_MAIL_ADDRESS } from "@calcom/lib/constants";
import type { AppMeta } from "@calcom/types/App";

import _package from "./package.json";

export const metadata = {
  name: "Jitsi Video",
  description: _package.description,
  installed: true,
  type: "jitsi_video",
  imageSrc: "/api/app-store/jitsivideo/icon.svg",
  variant: "conferencing",
  logo: "/api/app-store/jitsivideo/icon.svg",
  publisher: APP_NAME,
  url: "https://jitsi.org/",
  verified: true,
  rating: 0, // TODO: placeholder for now, pull this from TrustPilot or G2
  reviews: 0, // TODO: placeholder for now, pull this from TrustPilot or G2
  category: "video",
  slug: "jitsi",
  title: "Jitsi Meet",
  trending: true,
  isGlobal: false,
  email: SUPPORT_MAIL_ADDRESS,
  appData: {
    location: {
      linkType: "dynamic",
      type: "integrations:jitsi",
      label: "Jitsi Video",
    },
  },
} as AppMeta;

export default metadata;
