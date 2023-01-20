import type { AppMeta } from "@calcom/types/App";

import _package from "./package.json";

export const metadata = {
  name: "HubSpot CRM",
  installed: !!process.env.HUBSPOT_CLIENT_ID,
  description: _package.description,
  type: "hubspot_other_calendar",
  imageSrc: "/api/app-store/hubspot/icon.svg",
  variant: "other_calendar",
  logo: "/api/app-store/hubspot/icon.svg",
  publisher: "Cal.com",
  url: "https://hubspot.com/",
  verified: true,
  rating: 4.3, // TODO: placeholder for now, pull this from TrustPilot or G2
  reviews: 69, // TODO: placeholder for now, pull this from TrustPilot or G2
  categories: ["other"],
  label: "HubSpot CRM",
  slug: "hubspot",
  title: "HubSpot CRM",
  trending: true,
  email: "help@cal.com",
  dirName: "hubspot",
} as AppMeta;

export default metadata;
