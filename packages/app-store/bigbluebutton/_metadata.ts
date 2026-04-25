import type { AppMeta } from "@calcom/types/App";

import _package from "./package.json";

export const metadata = {
  name: "BigBlueButton",
  description: _package.description,
  type: "bigbluebutton_video",
  variant: "conferencing",
  categories: ["conferencing"],
  logo: "icon.svg",
  publisher: "Cal.diy",
  url: "https://bigbluebutton.org/",
  slug: "bigbluebutton",
  title: "BigBlueButton",
  email: "help@cal.com",
  appData: {
    location: {
      linkType: "dynamic",
      type: "integrations:bigbluebutton",
      label: "BigBlueButton Video",
    },
  },
  dirName: "bigbluebutton",
  isOAuth: false,
} as AppMeta;

export default metadata;
