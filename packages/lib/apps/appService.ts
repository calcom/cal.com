import type { AppCategories } from "@calcom/prisma/enums";

export const getApps = async (
  _categories?: AppCategories[],
  _onlyInstalled?: boolean
): Promise<unknown[]> => {
  return [];
};
