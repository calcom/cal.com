import type { App } from "@calcom/types/App";

import _package from "./package.json";

export const metadata = {
  name: "Close.com",
  description: _package.description,
  type: "closecom_other_calendar",
  imageSrc: "/api/app-store/closecomothercalendar/icon.svg",
  variant: "other_calendar",
  logo: "/api/app-store/closecomothercalendar/icon.svg",
  publisher: "Cal.com",
  url: "https://close.com/",
  verified: true,
  rating: 4.3, // TODO: placeholder for now, pull this from TrustPilot or G2
  reviews: 69, // TODO: placeholder for now, pull this from TrustPilot or G2
  category: "other",
  label: "Close.com",
  slug: "closecom",
  title: "Close.com",
  trending: true,
  email: "help@cal.com",
} as App;

export default metadata;
