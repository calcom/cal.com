import type { AppMeta } from "@calcom/types/App";

import _package from "./package.json";

export const metadata = {
  name: _package.name,
  description: _package.description,
  installed: true,
  category: "automation",
  categories: ["automation"],
  // If using static next public folder, can then be referenced from the base URL (/).
  logo: "icon-dark.svg",
  publisher: "Cal ID",
  slug: "wipe-my-cal",
  title: "Wipe my cal",
  type: "wipemycal_other",
  url: "https://cal.id/apps/wipe-my-cal",
  variant: "other",
  email: "support@cal.id",
  dirName: "wipemycalother",
  isOAuth: false,
} as AppMeta;

export default metadata;
