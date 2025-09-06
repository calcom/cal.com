import type { PlatformOAuthClient } from "@calcom/prisma/client";

export function getPlatformParams(platformOAuthClient: PlatformOAuthClient) {
  return {
    platformClientId: platformOAuthClient.id,
    platformCancelUrl: platformOAuthClient.bookingCancelRedirectUri,
    platformRescheduleUrl: platformOAuthClient.bookingRescheduleRedirectUri,
    platformBookingUrl: platformOAuthClient.bookingRedirectUri,
    arePlatformEmailsEnabled: platformOAuthClient.areEmailsEnabled,
    areCalendarEventsEnabled: platformOAuthClient.areCalendarEventsEnabled,
  };
}
