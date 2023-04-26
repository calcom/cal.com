import type { AppCategories } from "@prisma/client";

export const appCategories: { [K in AppCategories]: K } = {
  calendar: "calendar",
  messaging: "messaging",
  other: "other",
  payment: "payment",
  video: "video",
  web3: "web3",
  automation: "automation",
  analytics: "analytics",
};

export default appCategories;
