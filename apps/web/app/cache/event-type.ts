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
    return await getStaticTeamEventData(teamSlug, meetingSlug, orgSlug);
  },
  undefined,
  {
    revalidate: NEXTJS_CACHE_TTL,
    tags: ({ teamSlug, meetingSlug, orgSlug }: TeamEventParams) =>
      teamSlug && meetingSlug ? [getTeamEventCacheTag({ teamSlug, meetingSlug, orgSlug })] : [],
  }
);

export async function revalidateTeamEvent({ teamSlug, meetingSlug, orgSlug }: TeamEventParams) {
  revalidateTag(getTeamEventCacheTag({ teamSlug, meetingSlug, orgSlug }));
}
