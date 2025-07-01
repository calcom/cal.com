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

export const getCachedTeamWithEventTypes = unstable_cache(TeamService.getTeamWithEventTypes, undefined, {
  revalidate: NEXTJS_CACHE_TTL,
});

export const getCachedProcessedEventData = unstable_cache(
  EventTypeService.processEventDataForBooking,
  undefined,
  {
    revalidate: NEXTJS_CACHE_TTL,
  }
);

export const getCachedTeamFeatureFlags = unstable_cache(BookingService.getTeamFeatureFlags, undefined, {
  revalidate: NEXTJS_CACHE_TTL,
});

// Note: These methods are NOT cached as they depend on user/request context:
// - BookingService.getBookingSessionData (user session, reschedule UID)
// - BookingService.getCRMData (request query parameters)
// - EventTypeService.getEventTypeUsersData (user context dependent)
// - BookingService.isInstantMeeting (query parameter dependent)
// - BookingService.canRescheduleCancelledBooking (booking state dependent)
// - EventTypeService.canReschedule (reschedule UID dependent)
// - EventTypeService.canRescheduleCancelledBooking (booking state dependent)
