import type { AppMeta } from "@calcom/types/App";

import _package from "./package.json";

export const metadata = {
  name: "HubSpot CRM",
  installed: !!process.env.HUBSPOT_CLIENT_ID,
  description: _package.description,
  type: "hubspot_crm",
  variant: "crm",
  logo: "icon.svg",
  publisher: "Cal ID",
  url: "https://hubspot.com/",
  categories: ["crm"],
  label: "HubSpot CRM",
  slug: "hubspot",
  extendsFeature: "EventType",
  title: "HubSpot CRM",
  email: "support@cal.id",
  dirName: "hubspot",
  isOAuth: true,
} as AppMeta;

export default metadata;
