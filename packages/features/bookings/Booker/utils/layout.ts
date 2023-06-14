import type { BookerLayouts } from "@calcom/prisma/zod-utils";
import { bookerLayoutOptions } from "@calcom/prisma/zod-utils";

export const validateLayout = (layout?: BookerLayouts | null) => {
  return bookerLayoutOptions.find((validLayout) => validLayout === layout);
};
