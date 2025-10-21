import type { User } from "@calcom/prisma/client";

import { checkIfOrgNeedsUpgradeHandler } from "../organizations/checkIfOrgNeedsUpgrade.handler";
import { getUpgradeableHandler } from "../teams/getUpgradeable.handler";
import { checkInvalidAppCredentials } from "./checkForInvalidAppCredentials";
import { shouldVerifyEmailHandler } from "./shouldVerifyEmail.handler";

type Props = {
  ctx: {
    user: Pick<User, "id" | "emailVerified" | "identityProvider" | "email">;
  };
};

export const getUserTopBannersHandler = async ({ ctx }: Props) => {
  const upgradeableTeamMemberships = getUpgradeableHandler({ userId: ctx.user.id });
  const upgradeableOrgMemberships = checkIfOrgNeedsUpgradeHandler({ ctx });
  const shouldEmailVerify = shouldVerifyEmailHandler({
    ctx: {
      user: {
        ...ctx.user,
        emailVerified: !!ctx.user.emailVerified,
      },
    },
  });
  // const isInvalidCalendarCredential = checkInvalidGoogleCalendarCredentials({ ctx });
  const appsWithInvalidCredentials = checkInvalidAppCredentials({ ctx });

  const [
    teamUpgradeBanner,
    orgUpgradeBanner,
    verifyEmailBanner,
    // calendarCredentialBanner,
    invalidAppCredentialBanners,
  ] = await Promise.allSettled([
    upgradeableTeamMemberships,
    upgradeableOrgMemberships,
    shouldEmailVerify,
    // isInvalidCalendarCredential,
    appsWithInvalidCredentials,
  ]);

  return {
    teamUpgradeBanner: teamUpgradeBanner.status === "fulfilled" ? teamUpgradeBanner.value : [],
    orgUpgradeBanner: orgUpgradeBanner.status === "fulfilled" ? orgUpgradeBanner.value : [],
    verifyEmailBanner: verifyEmailBanner.status === "fulfilled" ? !verifyEmailBanner.value.isVerified : false,
    calendarCredentialBanner: false,
    invalidAppCredentialBanners:
      invalidAppCredentialBanners.status === "fulfilled" ? invalidAppCredentialBanners.value : [],
  };
};
