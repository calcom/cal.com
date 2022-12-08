import type { AppMeta } from "@calcom/types/App";

import config from "./config.json";

export const metadata = {
  category: "other",
  // FIXME: Currently for an app to be shown as installed, it must have this variable set. Either hardcoded or if it depends on some env variable, that should be checked here
  installed: true,
  rating: 0,
  reviews: 0,
  trending: true,
  verified: true,
  appData: {
    location: {
      linkType: "static",
      type: "integrations:ping_video",
      label: "Ping.gg",
      organizerInputPlaceholder: "https://www.ping.gg/call/theo",
      urlRegExp: "^http(s)?:\\/\\/(www\\.)?ping.gg\\/call\\/[a-zA-Z0-9]*",
    },
  },
  dirName: "ping",
  ...config,
} as AppMeta;

export default metadata;
