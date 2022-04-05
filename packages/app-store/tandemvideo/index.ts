import type { App } from "@calcom/types/App";

import { LocationType } from "../locations";
import _package from "./package.json";

export const metadata = {
  name: "Tandem Video",
  description: _package.description,
  installed: !!(process.env.TANDEM_CLIENT_ID && process.env.TANDEM_CLIENT_SECRET),
  type: "tandem_video",
  title: "Tandem Video",
  imageSrc: "/api/app-store/tandemvideo/icon.svg",
  variant: "conferencing",
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
  locationType: LocationType.Tandem,
  locationLabel: "Tandem Video",
} as App;

export * as api from "./api";
export * as lib from "./lib";
