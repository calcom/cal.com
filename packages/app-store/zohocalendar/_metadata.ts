import { validJson } from "@calcom/lib/jsonUtils";
import type { AppMeta } from "@calcom/types/App";

import _package from "./package.json";

export const metadata = {
  name: "Zoho Calendar",
  description: _package.description,
  installed: true,
  type: "zoho_calendar",
  title: "Zoho Calendar",
  imageSrc: "/api/app-store/zohocalendar/icon.svg",
  variant: "calendar",
  category: "calendar",
  categories: ["calendar"],
  logo: "/api/app-store/zohocalendar/icon.svg",
  publisher: "Cal.com",
  rating: 5,
  reviews: 69,
  slug: "zoho-calendar",
  trending: false,
  url: "https://cal.com/",
  verified: true,
  email: "help@cal.com",
  dirName: "zohocalendar",
} as AppMeta;

export default metadata;
