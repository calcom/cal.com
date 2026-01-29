import type { AppMeta } from "@calcom/types/App";
import _package from "./package.json";

export const metadata = {
  name: "HubSpot CRM",
  // biome-ignore lint/correctness/noProcessGlobal: Server-only metadata evaluated at build time
  installed: !!process.env.HUBSPOT_CLIENT_ID,
  description: _package.description,
  type: "hubspot_crm",
  variant: "crm",
  logo: "icon.svg",
  publisher: "Cal.com",
  url: "https://hubspot.com/",
  categories: ["crm"],
  label: "HubSpot CRM",
  slug: "hubspot",
  extendsFeature: "EventType",
  title: "HubSpot CRM",
  email: "help@cal.com",
  dirName: "hubspot",
  isOAuth: true,
} as AppMeta;

export default metadata;
