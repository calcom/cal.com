import type { NewBookingEventType } from "@calcom/features/bookings/lib/handleNewBooking/types";
import prisma from "@calcom/prisma";

import { WEBSITE_URL } from "../constants";
import { getBrand } from "../server/getBrand";

export const getBookerBaseUrl = async (organizationId: number | null) => {
  const orgBrand = await getBrand(organizationId);
  return orgBrand?.fullDomain ?? WEBSITE_URL;
};

export const getTeamBookerUrl = async (team: { organizationId: number | null }) => {
  const orgBrand = await getBrand(team.organizationId);
  return orgBrand?.fullDomain ?? WEBSITE_URL;
};

export const getBookerBaseUrlFromEventType = async (
  eventTypeTeam: NewBookingEventType["team"],
  organizerId: number,
  dynamicUserList: string[]
) => {
  if (eventTypeTeam) {
    const bookerBaseUrl = getBookerBaseUrl(eventTypeTeam.parentId);
    return bookerBaseUrl;
  }

  const organizerOrganizationProfile = await prisma.profile.findFirst({
    where: {
      userId: organizerId,
      username: dynamicUserList[0],
    },
  });

  const bookerBaseUrl = await getBookerBaseUrl(organizerOrganizationProfile?.organizationId ?? null);

  return bookerBaseUrl;
};
