import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import { checkIfOrgNeedsUpgradeHandler } from "../viewer/organizations/checkIfOrgNeedsUpgrade.handler";
import { getUpgradeableHandler } from "../viewer/teams/getUpgradeable.handler";
import { shouldVerifyEmailHandler } from "./shouldVerifyEmail.handler";

type GetUsersDefaultConferencingAppOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
};

export const getUserTopBannersHandler = async ({ ctx }: GetUsersDefaultConferencingAppOptions) => {
  const upgradeableTeamMememberships = getUpgradeableHandler({ ctx });
  const upgradeableOrgMememberships = checkIfOrgNeedsUpgradeHandler({ ctx });
  const shouldEmailVerify = shouldVerifyEmailHandler({ ctx });

  const [teamUpgradeBanner, orgUpgradeBanner, verifyEmailBanner] = await Promise.allSettled([
    upgradeableTeamMememberships,
    upgradeableOrgMememberships,
    shouldEmailVerify,
  ]);

  return {
    teamUpgradeBanner: teamUpgradeBanner.status === "fulfilled" ? teamUpgradeBanner.value : [],
    orgUpgradeBanner: orgUpgradeBanner.status === "fulfilled" ? orgUpgradeBanner.value : [],
    verifyEmailBanner: verifyEmailBanner.status === "fulfilled" ? verifyEmailBanner.value : undefined,
  };
};
