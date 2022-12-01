import { APP_NAME, SUPPORT_MAIL_ADDRESS } from "@calcom/lib/constants";
import type { AppMeta } from "@calcom/types/App";

export const metadata = {
  category: "other",
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
  "/*": "Don't modify slug - If required, do it using cli edit command",
  name: "Riverside",
  slug: "riverside",
  type: "riverside_video",
  imageSrc: "/api/app-store/riverside/icon-dark.svg",
  logo: "/api/app-store/riverside/icon-dark.svg",
  url: "https://cal.com/apps/riverside",
  variant: "conferencing",
  categories: ["video"],
  publisher: APP_NAME,
  email: SUPPORT_MAIL_ADDRESS,
  description:
    "Your online recording studio. The easiest way to record podcasts and videos in studio quality from anywhere. All from the browser.",
  __createdUsingCli: true,
} as AppMeta;

export default metadata;
