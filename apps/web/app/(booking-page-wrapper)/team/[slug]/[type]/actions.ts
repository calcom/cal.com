"use server";

import { revalidatePath } from "next/cache";
import { unstable_cache } from "next/cache";

import { NEXTJS_CACHE_TTL } from "@calcom/lib/constants";
import { BookingService } from "@calcom/lib/server/service/booking";
import { EventTypeService } from "@calcom/lib/server/service/eventType";
import { TeamService } from "@calcom/lib/server/service/team";

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

/**
 * Cached team data - changes infrequently (team settings, org structure)
 * Cache TTL: Default (longer caching)
 */
export const getCachedTeamWithEventTypes = unstable_cache(
  TeamService.getTeamWithEventTypes,
  ["team-with-event-types"],
  {
    revalidate: NEXTJS_CACHE_TTL,
  }
);

/**
 * Creates a cached version of processEventDataForBooking with fromRedirectOfNonOrgLink parameter
 * Cache TTL: Default (longer caching)
 */
const _cachedProcessEventDataForBooking = unstable_cache(
  EventTypeService.processEventDataForBooking,
  ["processed-event-data"],
  {
    revalidate: NEXTJS_CACHE_TTL,
  }
);

/**
 * Cached event data processing - changes infrequently (event type settings)
 * Cache TTL: Default (longer caching)
 */
export async function getCachedProcessedEventData(
  team: any,
  orgSlug: string | null,
  profileData: { image: string; name: string | null; username: string | null },
  fromRedirectOfNonOrgLink: boolean
) {
  return await _cachedProcessEventDataForBooking(team, orgSlug, profileData, fromRedirectOfNonOrgLink);
}

/**
 * Cached feature flags - changes infrequently (team feature configuration)
 * Cache TTL: Default (longer caching)
 */
export const getCachedTeamFeatureFlags = unstable_cache(
  BookingService.getTeamFeatureFlags,
  ["team-feature-flags"],
  {
    revalidate: NEXTJS_CACHE_TTL,
  }
);

// Non-cached synchronous data transformations (no DB calls):
export const processTeamDataForBooking = TeamService.processTeamDataForBooking;
export const getTeamProfileData = TeamService.getTeamProfileData;

// Note: These methods are NOT cached as they depend on user/request context:
// - BookingService.getBookingSessionData (user session, reschedule UID)
// - BookingService.getCRMData (request query parameters)
// - EventTypeService.getEventTypeUsersData (user context dependent)
// - BookingService.isInstantMeeting (query parameter dependent)
// - BookingService.canRescheduleCancelledBooking (booking state dependent)
// - EventTypeService.canReschedule (reschedule UID dependent)
// - EventTypeService.canRescheduleCancelledBooking (booking state dependent)
