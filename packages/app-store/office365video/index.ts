import type { App } from "@calcom/types/App";

import { LocationType } from "../locations";
import _package from "./package.json";

export const metadata = {
  name: "Microsoft 365/Teams",
  description: _package.description,
  installed: !!(process.env.MS_GRAPH_CLIENT_ID && process.env.MS_GRAPH_CLIENT_SECRET),
  type: "office365_video",
  imageSrc: "/api/app-store/office365video/icon.svg",
  variant: "conferencing",
  logo: "/api/app-store/office365video/icon.svg",
  publisher: "Cal.com",
  url: "https://www.microsoft.com/en-ca/microsoft-teams/group-chat-software",
  verified: true,
  rating: 4.3, // TODO: placeholder for now, pull this from TrustPilot or G2
  reviews: 69, // TODO: placeholder for now, pull this from TrustPilot or G2
  category: "video",
  slug: "msteams",
  title: "MS Teams",
  trending: true,
  email: "help@cal.com",
  locationType: LocationType.Teams,
  locationLabel: "MS Teams",
} as App;

export * as api from "./api";
export * as lib from "./lib";
