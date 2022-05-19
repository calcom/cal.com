import type { App } from "@calcom/types/App";

import _package from "./package.json";

export const metadata = {
  name: "Routing Forms",
  description: _package.description,
  installed: true,
  category: "other",
  imageSrc: "/api/app-store/routing-forms/icon.svg",
  logo: "/api/app-store/routing-forms/icon.svg",
  publisher: "Cal.com",
  rating: 0,
  reviews: 0,
  // This has to match the value in DB
  slug: "routing-forms",
  title: "Routing Forms",
  trending: true,
  type: "routing-forms_other",
  url: "https://cal.com/apps/zapier",
  variant: "other",
  verified: true,
  email: "help@cal.com",
} as App;

export default metadata;
