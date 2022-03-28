import type { App } from "@calcom/types/App";

import _package from "./package.json";

export const metadata = {
  name: "Microsoft 365/Teams",
  description: _package.description,
  installed: !!(process.env.MS_GRAPH_CLIENT_ID && process.env.MS_GRAPH_CLIENT_SECRET),
  type: "office365_video",
  imageSrc: "/apps/msteams.svg",
  variant: "conferencing",
  logo: "/apps/msteams.svg",
  publisher: "Cal.com",
  url: "https://www.microsoft.com/en-ca/microsoft-teams/group-chat-software",
  verified: true,
  rating: 4.3, // TODO: placeholder for now, pull this from TrustPilot or G2
  reviews: 69, // TODO: placeholder for now, pull this from TrustPilot or G2
  category: "video",
  label: "MS Teams",
  slug: "msteams",
  title: "MS Teams",
  trending: true,
  email: "help@cal.com",
  locationType: "integrations:office365_video",
} as App;

export * as api from "./api";
export * as lib from "./lib";
