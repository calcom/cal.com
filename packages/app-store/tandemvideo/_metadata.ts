import type { AppMeta } from "@calcom/types/App";

import _package from "./package.json";

export const metadata = {
  name: "Tandem Video",
  description: _package.description,
  type: "tandem_video",
  title: "Tandem Video",
  imageSrc: "/api/app-store/tandemvideo/icon.svg",
  variant: "conferencing",
  categories: ["video"],
  slug: "tandem",
  category: "video",
  logo: "/api/app-store/tandemvideo/icon.svg",
  publisher: "",
  url: "",
  verified: true,
  trending: true,
  rating: 0,
  reviews: 0,
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
} as AppMeta;

export default metadata;
