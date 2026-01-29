import type { AppMeta } from "@calcom/types/App";

import _package from "./package.json";

export const metadata = {
  name: "Infomaniak kMeet",
  description: _package.description,
  installed: false,
  type: "kmeet_video",
  variant: "conferencing",
  categories: ["conferencing"],
  logo: "icon.svg",
  publisher: "Infomaniak",
  url: "https://www.infomaniak.com/en/ksuite/kmeet",
  slug: "kmeet",
  title: "Infomaniak kMeet",
  isGlobal: false,
  email: "support@infomaniak.com",
  appData: {
    location: {
      linkType: "dynamic",
      type: "integrations:kmeet",
      label: "Infomaniak kMeet",
    },
  },
  dirName: "kmeet",
  concurrentMeetings: true,
  isOAuth: false,
} as AppMeta;

export default metadata;
