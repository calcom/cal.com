"use server";

import { revalidateTag, unstable_cache } from "next/cache";

import { NEXTJS_CACHE_TTL } from "@calcom/lib/constants";

import { getStaticTeamEventData } from "@lib/team/[slug]/[type]/getStaticData";

const CACHE_TAGS = {
  TEAM_EVENT: "TEAM_EVENT",
} as const;

export const getCachedTeamEvent = unstable_cache(
  async (teamSlug: string | null, meetingSlug: string | null, orgSlug: string | null) => {
    if (!teamSlug || !meetingSlug) {
      return null;
    }
    return await getStaticTeamEventData(teamSlug, eventTypeSlug, orgSlug);
  },
  undefined,
  { revalidate: NEXTJS_CACHE_TTL, tags: [CACHE_TAGS.TEAM_EVENT] }
);

export async function revalidateTeamEvent() {
  revalidateTag(CACHE_TAGS.TEAM_EVENT);
}
