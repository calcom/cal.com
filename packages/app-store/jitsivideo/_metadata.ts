import type { AppMeta } from "@calcom/types/App";

import _package from "./package.json";

export const metadata = {
  name: "Jitsi Video",
  description: _package.description,
  installed: true,
  type: "jitsi_video",
  imageSrc: "/api/app-store/jitsivideo/icon.svg",
  variant: "conferencing",
  categories: ["video"],
  logo: "/api/app-store/jitsivideo/icon.svg",
  publisher: "Cal.com",
  url: "https://jitsi.org/",
  verified: true,
  rating: 0, // TODO: placeholder for now, pull this from TrustPilot or G2
  reviews: 0, // TODO: placeholder for now, pull this from TrustPilot or G2
  slug: "jitsi",
  title: "Jitsi Meet",
  trending: true,
  isGlobal: false,
  email: "help@cal.com",
  appData: {
    location: {
      linkType: "dynamic",
      type: "integrations:jitsi",
      label: "Jitsi Video",
    },
  },
  dirName: "jitsivideo",
} as AppMeta;

export default metadata;
