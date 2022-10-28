import type { AppMeta } from "@calcom/types/App";

import _package from "./package.json";

export const metadata = {
  name: "Sendgrid",
  installed: true,
  description: _package.description,
  type: "sendgrid_other_calendar",
  imageSrc: "/api/app-store/sendgridothercalendar/icon.png",
  variant: "other_calendar",
  logo: "/api/app-store/sendgridothercalendar/icon.png",
  publisher: "Cal.com",
  url: "https://sendgrid.com/",
  verified: true,
  rating: 4.3, // TODO: placeholder for now, pull this from TrustPilot or G2
  reviews: 69, // TODO: placeholder for now, pull this from TrustPilot or G2
  category: "other",
  label: "Sendgrid",
  slug: "sendgrid",
  title: "Sendgrid",
  trending: true,
  email: "help@cal.com",
} as AppMeta;

export default metadata;
