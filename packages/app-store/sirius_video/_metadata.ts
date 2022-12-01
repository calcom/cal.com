import { APP_NAME, SUPPORT_MAIL_ADDRESS } from "@calcom/lib/constants";
import type { AppMeta } from "@calcom/types/App";

export const metadata = {
  category: "other",
  "/*": "Don't modify slug - If required, do it using cli edit command",
  name: "Sirius Video",
  slug: "sirius_video",
  type: "sirius_video_video",
  imageSrc: "/api/app-store/sirius_video/icon.svg",
  logo: "/api/app-store/sirius_video/icon.svg",
  url: "https://cal.com/apps/sirius_video",
  variant: "conferencing",
  categories: ["video"],
  publisher: APP_NAME,
  email: SUPPORT_MAIL_ADDRESS,
  description: "Video meetings made for music.\rCreate your own virtual music classroom, easily.",
  __createdUsingCli: true,
  appData: {
    location: {
      type: "integrations:sirius_video_video",
      label: "Sirius Video",
      linkType: "static",
      organizerInputPlaceholder: "https://sirius.video/sebastian",
      urlRegExp: "^http(s)?:\\/\\/(www\\.)?sirius.video\\/[a-zA-Z0-9]*",
    },
  },
} as AppMeta;

export default metadata;
