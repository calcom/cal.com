"use server";

import { revalidateTag, unstable_cache } from "next/cache";

import { NEXTJS_CACHE_TTL } from "@calcom/lib/constants";

import { getStaticTeamEventData } from "@lib/team/[slug]/[type]/getStaticData";

const CACHE_TAGS = {
  TEAM_EVENT: "TEAM_EVENT",
} as const;

type TeamEventParams = {
  teamSlug: string | null;
  meetingSlug: string | null;
  orgSlug: string | null;
};

function getTeamEventCacheTag({ teamSlug, meetingSlug, orgSlug }: TeamEventParams) {
  if (!teamSlug || !meetingSlug) {
    return;
  }

  return orgSlug
    ? `${CACHE_TAGS.TEAM_EVENT}:${orgSlug}:${teamSlug}:${meetingSlug}`
    : `${CACHE_TAGS.TEAM_EVENT}:${teamSlug}:${meetingSlug}`;
}

export const getCachedTeamEvent = unstable_cache(
  async ({ teamSlug, meetingSlug, orgSlug }: TeamEventParams) => {
    if (!teamSlug || !meetingSlug) {
      return null;
    }
    try {
      const result = await getStaticTeamEventData(teamSlug, meetingSlug, orgSlug);
      return result;
    } catch (error) {
      console.error("Error in getCachedTeamEvent:", error, {
        teamSlug,
        meetingSlug,
        orgSlug,
      });
      return null;
    }
  },
  ["team-event"],
  {
    revalidate: NEXTJS_CACHE_TTL,
    tags: ["team-events"],
  }
);

export async function revalidateTeamEvent({ teamSlug, meetingSlug, orgSlug }: TeamEventParams) {
  const tag = getTeamEventCacheTag({ teamSlug, meetingSlug, orgSlug });
  if (tag) {
    revalidateTag(tag);
  }
}
