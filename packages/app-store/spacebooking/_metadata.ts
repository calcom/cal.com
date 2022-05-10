import type { App } from "@calcom/types/App";

import _package from "./package.json";

export const metadata = {
  name: "SpaceBooking",
  description: _package.description,
  installed: true,
  category: "other",
  // If using static next public folder, can then be referenced from the base URL (/).
  imageSrc: "/api/app-store/spacebooking/spacebooking.webp",
  logo: "/api/app-store/spacebooking/spacebooking.webp",
  publisher: "Cal.com",
  rating: 0,
  reviews: 0,
  slug: "space-booking",
  title: "SpaceBooking",
  trending: true,
  type: "spacebooking_other",
  url: "https://cal.com/apps/spacebooking",
  variant: "other",
  verified: true,
  email: "help@cal.com",
} as App;

export default metadata;
