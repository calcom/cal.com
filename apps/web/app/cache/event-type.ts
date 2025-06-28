"use server";

import { revalidatePath, unstable_cache } from "next/cache";

import { NEXTJS_CACHE_TTL } from "@calcom/lib/constants";

import { getStaticTeamEventData } from "@lib/team/[slug]/[type]/getStaticData";

type TeamEventParams = {
  teamSlug: string | null;
  meetingSlug: string | null;
  orgSlug: string | null;
};

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
  }
);

export async function revalidateTeamEvent({ teamSlug, meetingSlug, orgSlug }: TeamEventParams) {
  if (!teamSlug || !meetingSlug) {
    return;
  }

  if (orgSlug) {
    revalidatePath(`/org/${orgSlug}/team/${teamSlug}/${meetingSlug}`);
  } else {
    revalidatePath(`/team/${teamSlug}/${meetingSlug}`);
  }
}
