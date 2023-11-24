import { getCalendarCredentials, getConnectedCalendars } from "@calcom/core/CalendarManager";
import { prisma } from "@calcom/prisma";
import { credentialForCalendarServiceSelect } from "@calcom/prisma/selects/credential";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import { checkIfOrgNeedsUpgradeHandler } from "../viewer/organizations/checkIfOrgNeedsUpgrade.handler";
import { getUpgradeableHandler } from "../viewer/teams/getUpgradeable.handler";
import { shouldVerifyEmailHandler } from "./shouldVerifyEmail.handler";

type Props = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
};

const checkInvalidGoogleCalendarCredentials = async ({ ctx }: Props) => {
  const userCredentials = await prisma.credential.findMany({
    where: {
      userId: ctx.user.id,
      type: "google_calendar",
    },
    select: credentialForCalendarServiceSelect,
  });

  const calendarCredentials = getCalendarCredentials(userCredentials);

  const { connectedCalendars } = await getConnectedCalendars(
    calendarCredentials,
    ctx.user.selectedCalendars,
    ctx.user.destinationCalendar?.externalId
  );

  let doesInvalidCredentialsExist = false;

  for (const calendar of connectedCalendars) {
    const isErrorPresent = !!calendar.error;
    if (isErrorPresent) {
      doesInvalidCredentialsExist = true;
    }
  }

  return doesInvalidCredentialsExist;
};

export const getUserTopBannersHandler = async ({ ctx }: Props) => {
  const upgradeableTeamMememberships = getUpgradeableHandler({ ctx });
  const upgradeableOrgMememberships = checkIfOrgNeedsUpgradeHandler({ ctx });
  const shouldEmailVerify = shouldVerifyEmailHandler({ ctx });
  const isInvalidCalendarCredential = checkInvalidGoogleCalendarCredentials({ ctx });

  const [teamUpgradeBanner, orgUpgradeBanner, verifyEmailBanner, calendarCredentialBanner] =
    await Promise.allSettled([
      upgradeableTeamMememberships,
      upgradeableOrgMememberships,
      shouldEmailVerify,
      isInvalidCalendarCredential,
    ]);

  return {
    teamUpgradeBanner: teamUpgradeBanner.status === "fulfilled" ? teamUpgradeBanner.value : [],
    orgUpgradeBanner: orgUpgradeBanner.status === "fulfilled" ? orgUpgradeBanner.value : [],
    verifyEmailBanner: verifyEmailBanner.status === "fulfilled" ? verifyEmailBanner.value : undefined,
    calendarCredentialBanner:
      calendarCredentialBanner.status === "fulfilled" ? calendarCredentialBanner.value : undefined,
  };
};
