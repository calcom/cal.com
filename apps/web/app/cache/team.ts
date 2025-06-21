"use server";

import { revalidateTag, unstable_cache } from "next/cache";

import { NEXTJS_CACHE_TTL } from "@calcom/lib/constants";
import { TeamRepository } from "@calcom/lib/server/repository/team";

const CACHE_TAGS = {
  TEAMS_LIST: "TeamRepository.findTeamsByUserId",
} as const;

export const getCachedTeams = unstable_cache(
  async (userId: number) => {
    return await TeamRepository.findTeamsByUserId({
      userId,
      includeOrgs: true,
    });
  },
  ["getCachedTeams"],
  { revalidate: NEXTJS_CACHE_TTL, tags: [CACHE_TAGS.TEAMS_LIST] }
);

export async function revalidateTeamsList() {
  revalidateTag(CACHE_TAGS.TEAMS_LIST);
}
