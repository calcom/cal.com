"use server";

import { revalidateTag, unstable_cache } from "next/cache";

import { NEXTJS_CACHE_TTL } from "@calcom/lib/constants";
import { OrganizationRepository } from "@calcom/lib/server/repository/organization";

const CACHE_TAGS = {
  ORG_CURRENT: "OrganizationRepository.findCurrentOrg",
  ORG_TEAMS: "OrganizationRepository.getTeams",
} as const;

export const getCachedCurrentOrg = unstable_cache(
  async (userId: number, orgId: number) => {
    return await OrganizationRepository.findCurrentOrg({
      userId,
      orgId,
    });
  },
  ["getCachedCurrentOrg"],
  {
    revalidate: NEXTJS_CACHE_TTL,
    tags: [CACHE_TAGS.ORG_CURRENT],
  }
);

export const getCachedOrgTeams = unstable_cache(
  async (orgId: number) => {
    return await OrganizationRepository.getTeams({ organizationId: orgId });
  },
  ["getCachedOrgTeams"],
  {
    revalidate: NEXTJS_CACHE_TTL,
    tags: [CACHE_TAGS.ORG_TEAMS],
  }
);

export async function revalidateOrganizationTeams() {
  revalidateTag(CACHE_TAGS.ORG_TEAMS);
}

export async function revalidateCurrentOrg() {
  revalidateTag(CACHE_TAGS.ORG_CURRENT);
}
