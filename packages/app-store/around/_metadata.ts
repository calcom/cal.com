import type { App } from "@calcom/types/App";

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
      default: false,
      type: "integrations:around_video",
      label: "Around Video",
      urlRegExp: "^http(s)?:\\/\\/(www\\.)?around.co\\/[a-zA-Z0-9]*",
      organizerInputPlaceholder: "https://www.around.co/rick",
    },
  },
  ...config,
} as App;

export default metadata;
