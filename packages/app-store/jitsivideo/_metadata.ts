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
  slug: "jitsi",
  title: "Jitsi Meet",
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
