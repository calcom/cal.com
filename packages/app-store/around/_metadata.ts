import type { AppMeta } from "@calcom/types/App";

import config from "./config.json";

export const metadata = {
  dirName: "around",
  appData: {
    location: {
      linkType: "static",
      type: "integrations:around_video",
      label: "Around Video",
      urlRegExp: "^http(s)?:\\/\\/(www\\.)?around.co\\/[a-zA-Z0-9]*",
      organizerInputPlaceholder: "https://www.around.co/rick",
    },
  },
  ...config,
} as AppMeta;

export default metadata;
