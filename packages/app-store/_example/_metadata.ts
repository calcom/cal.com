import type { AppMeta } from "@calcom/types/App";

import _package from "./package.json";

export const metadata = {
  name: _package.name,
  description: _package.description,
  installed: true,
  category: "video",
  // If using static next public folder, can then be referenced from the base URL (/).
  imageSrc: "/api/app-store/_example/icon.svg",
  logo: "/api/app-store/_example/icon.svg",
  publisher: "Cal.com",
  rating: 5,
  reviews: 69,
  slug: "example_video",
  title: "Example App",
  trending: true,
  type: "example_video",
  url: "https://cal.com/",
  variant: "conferencing",
  verified: true,
  email: "help@cal.com",
} as AppMeta;

export default metadata;
