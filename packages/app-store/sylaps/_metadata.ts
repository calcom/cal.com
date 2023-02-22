import type { AppMeta } from "@calcom/types/App";

import _package from "./package.json";

export const metadata = {
  name: "Sylaps",
  description: _package.description,
  installed: true,
  type: "sylaps_video",
  imageSrc: "/api/app-store/sylaps/icon.svg",
  variant: "conferencing",
  categories: ["video"],
  logo: "/api/app-store/sylaps/icon.svg",
  publisher: "Sylaps Inc",
  url: "https://sylaps.com/",
  verified: true,
  rating: 0, // TODO: placeholder for now, pull this from TrustPilot or G2
  reviews: 0, // TODO: placeholder for now, pull this from TrustPilot or G2
  slug: "sylaps",
  title: "Sylaps",
  trending: true,
  isGlobal: false,
  email: "support@sylaps.com",
  appData: {
    location: {
      linkType: "dynamic",
      type: "integrations:sylaps",
      label: "Sylaps",
    },
  },
  dirName: "sylaps",
} as AppMeta;

export default metadata;
