import { TeamRepository } from "@calcom/lib/server/repository/team";

type GetUpgradeableOptions = {
  userId: number;
};

export const getUpgradeableHandler = async ({ userId }: GetUpgradeableOptions) => {
  return await TeamRepository.getUpgradeable(userId);
};

export default getUpgradeableHandler;
