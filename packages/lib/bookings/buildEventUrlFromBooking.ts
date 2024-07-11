import { getBookerBaseUrl } from "@calcom/lib/getBookerUrl/server";

type BookingEventType = {
  slug: string;
  owner: {
    id: number;
    profile: { organizationId: number | null; username: string | null };
    username: string | null;
  } | null;
  team: {
    slug: string | null;
    parentId: number | null;
  } | null;
};

type BookingUser = {
  profile: { organizationId: number | null };
} | null;

export function getOrganizationIdOfBooking(booking: {
  eventType: BookingEventType;
  user: BookingUser;
  eventOwner: BookingUser;
  dynamicEventSlugRef?: string;
}) {
  const { eventType, user, eventOwner, dynamicEventSlugRef } = booking;
  const isDynamicGroupEvent = !!dynamicEventSlugRef;
  return (
    (eventType.team
      ? eventType.team.parentId
      : isDynamicGroupEvent
      ? // Dynamic Group Event is a special case where there is no team and no owner of the event. So, we get the organizationId from the booking.user which would be the first user in the group.
        user?.profile.organizationId
      : eventOwner?.profile?.organizationId) ?? null
  );
}

export async function buildEventUrlFromBooking(booking: {
  eventType: BookingEventType;
  user: BookingUser;
  dynamicGroupSlugRef: string | null;
  dynamicEventSlugRef: string | null;
}) {
  const { eventType, dynamicEventSlugRef, dynamicGroupSlugRef, user } = booking;
  const eventSlug = eventType.slug;
  const eventOwner = eventType.owner;
  const eventTeam = eventType.team;
  const bookingOrganizationId = getOrganizationIdOfBooking({ eventType, user, eventOwner });

  const bookerUrl = await getBookerBaseUrl(bookingOrganizationId);

  if (dynamicEventSlugRef) {
    return `${bookerUrl}/${dynamicGroupSlugRef}/${eventSlug}`;
  }

  if (eventTeam?.slug) {
    return `${bookerUrl}/team/${eventTeam.slug}/${eventSlug}`;
  }

  const username = eventOwner?.profile?.username;
  return `${bookerUrl}/${username}/${eventSlug}`;
}
