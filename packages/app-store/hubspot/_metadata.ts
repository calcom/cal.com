import type { AppMeta } from "@calcom/types/App";

export const metadata = {
  name: "HubSpot CRM",
  // biome-ignore lint/correctness/noProcessGlobal: Server-only metadata evaluated at build time
  installed: !!process.env.HUBSPOT_CLIENT_ID,
  description:
    "HubSpot is a cloud-based CRM designed to help align sales and marketing teams, foster sales enablement, boost ROI and optimize your inbound marketing strategy to generate more, qualified leads.",
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
