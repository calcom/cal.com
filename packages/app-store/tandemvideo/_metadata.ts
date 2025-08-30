import type { AppMeta } from "@calcom/types/App";

import _package from "./package.json";

export const metadata = {
  name: "Tandem Video",
  description: _package.description,
  type: "tandem_video",
  title: "Tandem Video",
  variant: "conferencing",
  categories: ["conferencing"],
  slug: "tandem",
  category: "conferencing",
  logo: "icon.svg",
  publisher: "",
  url: "",
  isGlobal: false,
  email: "help@cal.com",
  appData: {
    location: {
      linkType: "dynamic",
      type: "integrations:tandem",
      label: "Tandem Video",
    },
  },
  dirName: "tandemvideo",
  isOAuth: true,
} as AppMeta;

export default metadata;
