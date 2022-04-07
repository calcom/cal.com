import type { App } from "@calcom/types/App";

import _package from "./package.json";

export const metadata = {
  name: "HubSpot CRM",
  description: _package.description,
  installed: !!(process.env.HUBSPOT_CLIENT_ID && process.env.HUBSPOT_CLIENT_SECRET),
  type: "hubspot_other",
  imageSrc: "/api/app-store/hubspotother/icon.svg",
  variant: "other",
  logo: "/api/app-store/hubspotother/icon.svg",
  publisher: "Cal.com",
  url: "https://hubspot.com/",
  verified: true,
  rating: 4.3, // TODO: placeholder for now, pull this from TrustPilot or G2
  reviews: 69, // TODO: placeholder for now, pull this from TrustPilot or G2
  category: "crm",
  label: "HubSpot CRM",
  slug: "hubspot",
  title: "HubSpot CRM",
  trending: true,
  email: "help@cal.com",
  locationType: "integrations:hubspot",
} as App;

export * as api from "./api";
//export * as lib from "./lib";
