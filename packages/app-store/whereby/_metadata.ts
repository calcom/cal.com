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
      type: "integrations:whereby_video",
      label: "Whereby Video",
      organizerInputPlaceholder: "https://www.whereby.com/cal",
      urlRegExp: "^http(s)?:\\/\\/(www\\.)?(team.)?whereby.com\\/[a-zA-Z0-9]*",
    },
  },
  ...config,
} as AppMeta;

export default metadata;
