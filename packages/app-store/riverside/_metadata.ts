import type { AppMeta } from "@calcom/types/App";

import config from "./config.json";

export const metadata = {
  // FIXME: Currently for an app to be shown as installed, it must have this variable set. Either hardcoded or if it depends on some env variable, that should be checked here
  installed: true,
  rating: 0,
  reviews: 0,
  trending: true,
  verified: true,
  locationPlaceholder: "https://www.riverside.fm/studio/rick",
  appData: {
    location: {
      label: "Riverside Video",
      urlRegExp: "^http(s)?:\\/\\/(www\\.)?riverside.fm\\/studio\\/[a-zA-Z0-9]*",
      type: "integrations:riverside_video",
      linkType: "static",
    },
  },
  dirName: "riverside",
  ...config,
} as AppMeta;

export default metadata;
