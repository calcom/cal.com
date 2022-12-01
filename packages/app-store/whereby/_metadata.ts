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
  appData: {
    location: {
      linkType: "static",
      type: "integrations:whereby_video",
      label: "Whereby Video",
      organizerInputPlaceholder: "https://www.whereby.com/cal",
      urlRegExp: "^http(s)?:\\/\\/(www\\.)?whereby.com\\/[a-zA-Z0-9]*",
    },
  },
  "/*": "Don't modify slug - If required, do it using cli edit command",
  name: "Whereby",
  title: "Whereby",
  slug: "whereby",
  type: "whereby_video",
  imageSrc: "/api/app-store/whereby/icon.svg",
  logo: "/api/app-store/whereby/icon.svg",
  url: "https://cal.com/apps/whereby",
  variant: "conferencing",
  categories: ["video"],
  publisher: APP_NAME,
  email: SUPPORT_MAIL_ADDRESS,
  description: "Whereby makes it super simple for collaborating teams to jump on a video call.",
  __createdUsingCli: true,
} as AppMeta;

export default metadata;
