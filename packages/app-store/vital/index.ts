import type { App } from "@calcom/types/App";

import _package from "./package.json";

export const metadata = {
  name: _package.name,
  description: _package.description,
  installed: true,
  category: "automation",
  // If using static next public folder, can then be referenced from the base URL (/).
  imageSrc: "/api/app-store/vital/icon.svg",
  logo: "/api/app-store/vital/icon.svg",
  label: "Vital",
  publisher: "Vital",
  rating: 5,
  reviews: 69,
  slug: "vital_automation",
  title: "Vital",
  trending: true,
  type: "vital_other",
  url: "https://tryvital.io",
  variant: "conferencing",
  verified: true,
  email: "support@tryvital.io",
} as App;

export * as api from "./api";
export * as lib from "./lib";
