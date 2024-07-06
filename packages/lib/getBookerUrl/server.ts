import type { EventType } from "@prisma/client";

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
  eventTypeTeam: EventType["team"],
  organizerId: string,
  dynamicUserList: string[]
) => {
  if (eventTypeTeam) {
    return await getBookerBaseUrl(eventTypeTeam.parentId);
  }

  const organizerOrganizationProfile = await prisma.profile.findFirst({
    where: {
      userId: organizerId,
      username: dynamicUserList[0],
    },
  });

  return await getBookerBaseUrl(organizerOrganizationProfile?.organizationId ?? null);
};
