import type { AppMeta } from "@calcom/types/App";

import _package from "./package.json";

export const metadata = {
  name: _package.name,
  description: _package.description,
  installed: true,
  category: "other",
  categories: ["other"],
  // If using static next public folder, can then be referenced from the base URL (/).
  imageSrc: "/api/app-store/wipemycalother/icon-dark.svg",
  logo: "/api/app-store/wipemycalother/icon-dark.svg",
  publisher: "Cal.com",
  rating: 0,
  reviews: 0,
  slug: "wipe-my-cal",
  title: "Wipe my cal",
  trending: true,
  type: "wipemycal_other",
  url: "https://cal.com/apps/wipe-my-cal",
  variant: "other",
  verified: true,
  email: "help@cal.com",
  dirName: "wipemycalother",
} as AppMeta;

export default metadata;
