"use server";

import { revalidatePath } from "next/cache";
import { unstable_cache } from "next/cache";

import { NEXTJS_CACHE_TTL } from "@calcom/lib/constants";
import { EventTypeService } from "@calcom/lib/server/service/eventType";
import { TeamService } from "@calcom/lib/server/service/team";
import type { TeamWithEventTypes } from "@calcom/lib/server/service/team";

export async function revalidateTeamBookingPage(
  teamSlug: string,
  meetingSlug: string,
  orgSlug: string | null
) {
  if (orgSlug) {
    revalidatePath(`/org/${orgSlug}/team/${teamSlug}/${meetingSlug}`);
  } else {
    revalidatePath(`/team/${teamSlug}/${meetingSlug}`);
  }
}

export const getCachedTeamWithEventTypes = unstable_cache(
  async (teamSlug: string, meetingSlug: string, orgSlug: string | null) => {
    return await TeamService.getTeamWithEventTypes(teamSlug, meetingSlug, orgSlug);
  },
  undefined,
  {
    revalidate: NEXTJS_CACHE_TTL,
  }
);

export const getCachedProcessedEventData = unstable_cache(
  async (team: TeamWithEventTypes, orgSlug: string | null, fromRedirectOfNonOrgLink: boolean) => {
    return await EventTypeService.processEventDataForBooking(team, orgSlug, fromRedirectOfNonOrgLink);
  },
  undefined,
  {
    revalidate: NEXTJS_CACHE_TTL,
  }
);
