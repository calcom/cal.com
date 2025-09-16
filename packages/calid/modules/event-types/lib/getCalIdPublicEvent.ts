import { getDefaultAvatar } from "@calid/features/lib/defaultAvatar";
import type { Prisma } from "@prisma/client";

import type { LocationObject } from "@calcom/app-store/locations";
import { getBookingFieldsWithSystemFields } from "@calcom/features/bookings/lib/getBookingFields";
import { getSlugOrRequestedSlug } from "@calcom/features/ee/organizations/lib/orgDomains";
import { getPublicEventSelect } from "@calcom/features/eventtypes/lib/getPublicEvent";
import { getPlaceholderAvatar } from "@calcom/lib/defaultAvatarImage";
import { getUsernameList } from "@calcom/lib/defaultEvents";
import { getUserAvatarUrl } from "@calcom/lib/getAvatarUrl";
import { getBookerBaseUrlSync } from "@calcom/lib/getBookerUrl/client";
import { parseRecurringEvent } from "@calcom/lib/isRecurringEvent";
import { isRecurringEvent } from "@calcom/lib/isRecurringEvent";
import { privacyFilteredLocations } from "@calcom/lib/location";
import { markdownToSafeHTML } from "@calcom/lib/markdownToSafeHTML";
import { UserRepository } from "@calcom/lib/server/repository/user";
import { teamMetadataSchema } from "@calcom/prisma/zod-utils";
import { eventTypeMetaDataSchemaWithTypedApps } from "@calcom/prisma/zod-utils";
import { customInputSchema } from "@calcom/prisma/zod-utils";
import { bookerLayouts as bookerLayoutsSchema } from "@calcom/prisma/zod-utils";
import { userMetadata as userMetadataSchema } from "@calcom/prisma/zod-utils";

// Custom select for CalId team events
const getCalIdPublicEventSelect = (fetchAllUsers: boolean) => {
  const baseSelect = getPublicEventSelect(fetchAllUsers);
  return {
    ...baseSelect,
    calIdTeam: {
      select: {
        id: true,
        name: true,
        slug: true,
        logoUrl: true,
        bio: true,
        hideTeamBranding: true,
        hideTeamProfileLink: true,
        isTeamPrivate: true,
        hideBookATeamMember: true,
        brandColor: true,
        darkBrandColor: true,
        theme: true,
        metadata: true,
        bannerUrl: true,
        timeZone: true,
        weekStart: true,
        timeFormat: true,
      },
    },
    team: undefined, // Remove team selection for CalId events
  };
};

// Custom profile function for CalId team events
function getCalIdProfileFromEvent(event: {
  calIdTeam?: any;
  subsetOfHosts?: any[];
  hosts?: any[];
  owner?: any;
  metadata?: any;
}) {
  const { calIdTeam, subsetOfHosts: hosts, owner } = event;
  const nonTeamprofile = hosts?.[0]?.user || owner;
  const profile = calIdTeam || nonTeamprofile;
  if (!profile) throw new Error("Event has no owner");

  const username = "username" in profile ? profile.username : calIdTeam?.slug;
  const weekStart = hosts?.[0]?.user?.weekStart || owner?.weekStart || "Monday";
  const eventMetaData = eventTypeMetaDataSchemaWithTypedApps.parse(event.metadata || {});
  const userMetaData = userMetadataSchema.parse(profile.metadata || {});

  return {
    username,
    name: profile.name,
    weekStart,
    image: calIdTeam
      ? getDefaultAvatar(calIdTeam)
      : getUserAvatarUrl({
          avatarUrl: nonTeamprofile?.avatarUrl,
        }),
    brandColor: profile.brandColor,
    darkBrandColor: profile.darkBrandColor,
    theme: profile.theme,
    bookerLayouts: bookerLayoutsSchema.parse(
      eventMetaData?.bookerLayouts ||
        (userMetaData && "defaultBookerLayouts" in userMetaData ? userMetaData.defaultBookerLayouts : null) ||
        null
    ),
  };
}

async function getOwnerFromUsersArray(prisma: any, eventTypeId: number) {
  const { users } = await prisma.eventType.findUniqueOrThrow({
    where: { id: eventTypeId },
    select: {
      users: {
        select: {
          avatarUrl: true,
          username: true,
          name: true,
          weekStart: true,
          id: true,
        },
      },
    },
  });
  if (!users.length) return null;

  // Batch enrich users in a single call
  const enrichedUsers = await new UserRepository(prisma).enrichUsersWithTheirProfiles(users);

  // Map the enriched users back to include the organization info
  const usersWithUserProfile = enrichedUsers.map((user) => ({
    ...user,
    organizationId: user.profile?.organization?.id ?? null,
    organization: user.profile?.organization,
    profile: user.profile,
  }));

  return [
    {
      ...usersWithUserProfile[0],
      bookerUrl: getBookerBaseUrlSync(usersWithUserProfile[0].organization?.slug ?? null),
    },
  ];
}

export async function getCalIdPublicEvent(
  username: string,
  eventSlug: string,
  org: string | null,
  prisma: any,
  fromRedirectOfNonOrgLink: boolean,
  currentUserId?: number,
  fetchAllUsers = false
) {
  console.log(
    "getCalIdPublicEvent",
    username,
    eventSlug,
    org,
    prisma,
    fromRedirectOfNonOrgLink,
    currentUserId,
    fetchAllUsers
  );
  const _usernameList = getUsernameList(username);
  const orgQuery = org ? getSlugOrRequestedSlug(org) : null;

  // Query for CalId team events
  const slugQuery = getSlugOrRequestedSlug(username);
  console.log("Slug query for username:", username, "->", slugQuery);

  const usersOrTeamQuery = {
    calIdTeam: {
      ...slugQuery,
    },
  };

  console.log("Searching for CalId team event with query:", {
    slug: eventSlug,
    ...usersOrTeamQuery,
  });

  const selectQuery = getCalIdPublicEventSelect(fetchAllUsers);
  console.log("Select query includes bookingFields:", !!selectQuery.bookingFields);

  // Query the event type from database
  let event = await prisma.eventType.findFirst({
    where: {
      slug: eventSlug,
      ...usersOrTeamQuery,
    },
    select: selectQuery,
  });

  console.log("Query result:", event ? "Found event" : "No event found");

  // If no event was found, check for platform org user event
  if (!event && !orgQuery) {
    console.log("No CalId team event found, checking platform org user event:", username, eventSlug);
    event = await prisma.eventType.findFirst({
      where: {
        slug: eventSlug,
        users: {
          some: {
            username,
            isPlatformManaged: false,
            profiles: {
              some: {
                organization: {
                  isPlatform: true,
                },
              },
            },
          },
        },
      },
      select: getCalIdPublicEventSelect(fetchAllUsers),
    });
    console.log("Platform org user event query result:", event ? "Found event" : "No event found");
  }

  if (!event) {
    console.log("No event found for CalId team:", username, eventSlug, org);
    return null;
  }

  console.log("Event found for CalId team:", event.id, event.title, event.bookingFields);

  const eventMetaData = eventTypeMetaDataSchemaWithTypedApps.parse(event.metadata || {});
  const teamMetadata = teamMetadataSchema.parse(event.calIdTeam?.metadata || {});
  const usersAsHosts = event.hosts.map((host) => host.user);

  // Enrich users in a single batch call
  const enrichedUsers = await new UserRepository(prisma).enrichUsersWithTheirProfiles(usersAsHosts);

  // Map enriched users back to the hosts
  const hosts = event.hosts.map((host, index) => ({
    ...host,
    user: enrichedUsers[index],
  }));

  const eventWithUserProfiles = {
    ...event,
    owner: event.owner
      ? await new UserRepository(prisma).enrichUserWithItsProfile({
          user: event.owner,
        })
      : null,
    subsetOfHosts: hosts,
    hosts: fetchAllUsers ? hosts : undefined,
  };

  // For CalId teams, we need to handle users differently since we don't have a team property
  let users = null;
  if (eventWithUserProfiles.calIdTeam) {
    // For CalId teams, get users from hosts or fallback to owner
    const eventHosts = eventWithUserProfiles.hosts || eventWithUserProfiles.subsetOfHosts || [];
    if (eventHosts.length > 0) {
      users = eventHosts
        .filter((host) => host.user.username)
        .map((host) => ({
          username: host.user.username,
          name: host.user.name,
          weekStart: host.user.weekStart,
          organizationId: host.user.profile?.organization?.id ?? null,
          avatarUrl: host.user.avatarUrl,
          profile: host.user.profile,
          bookerUrl: getBookerBaseUrlSync(host.user.profile?.organization?.slug ?? null),
        }));
    } else {
      users = await getOwnerFromUsersArray(prisma, event.id);
    }
  } else {
    // For non-CalId teams, fallback to owner
    users = await getOwnerFromUsersArray(prisma, event.id);
  }

  if (users === null) {
    throw new Error(`EventType ${event.id} has no owner or users.`);
  }

  // In case the event schedule is not defined, use the event owner's default schedule
  if (!eventWithUserProfiles.schedule && eventWithUserProfiles.owner?.defaultScheduleId) {
    const eventOwnerDefaultSchedule = await prisma.schedule.findUnique({
      where: {
        id: eventWithUserProfiles.owner?.defaultScheduleId,
      },
      select: {
        id: true,
        timeZone: true,
      },
    });
    eventWithUserProfiles.schedule = eventOwnerDefaultSchedule;
  }

  let orgDetails:
    | Pick<Prisma.TeamGetPayload<{ select: { logoUrl: true; name: true } }>, "logoUrl" | "name">
    | undefined
    | null;
  if (org) {
    orgDetails = await prisma.team.findFirst({
      where: {
        slug: org,
        parentId: null,
      },
      select: {
        logoUrl: true,
        name: true,
      },
    });
  }

  let showInstantEventConnectNowModal = eventWithUserProfiles.isInstantEvent;

  if (eventWithUserProfiles.isInstantEvent && eventWithUserProfiles.instantMeetingSchedule?.id) {
    const { id: _id, timeZone: _timeZone } = eventWithUserProfiles.instantMeetingSchedule;
    showInstantEventConnectNowModal = true;
  }

  // Ensure bookingFields is properly processed for CalId team events
  const processedBookingFields = getBookingFieldsWithSystemFields({
    bookingFields: event.bookingFields || [],
    disableGuests: event.disableGuests,
    isOrgTeamEvent: false, // CalId teams don't have parent organizations
    disableBookingTitle: false, // Allow booking title for team events
    customInputs: event.customInputs || [],
    metadata: event.metadata || {},
    workflows: event.workflows || [],
  });

  console.log("CalId team event - Original event bookingFields:", event.bookingFields);
  console.log("CalId team event - Processed bookingFields:", processedBookingFields);

  return {
    ...eventWithUserProfiles,
    bookerLayouts: bookerLayoutsSchema.parse(eventMetaData?.bookerLayouts || null),
    description: markdownToSafeHTML(eventWithUserProfiles.description),
    metadata: eventMetaData,
    customInputs: customInputSchema.array().parse(event.customInputs || []),
    locations: privacyFilteredLocations((eventWithUserProfiles.locations || []) as LocationObject[]),
    bookingFields: processedBookingFields, // Use the processed booking fields
    recurringEvent: isRecurringEvent(eventWithUserProfiles.recurringEvent)
      ? parseRecurringEvent(event.recurringEvent)
      : null,
    // Sets user data on profile object for easier access
    profile: getCalIdProfileFromEvent({
      ...eventWithUserProfiles,
      calIdTeam: eventWithUserProfiles.calIdTeam,
    }),
    subsetOfUsers: users,
    users: fetchAllUsers ? users : undefined,
    entity: {
      fromRedirectOfNonOrgLink,
      considerUnpublished:
        !fromRedirectOfNonOrgLink &&
        (eventWithUserProfiles.calIdTeam?.slug === null ||
          eventWithUserProfiles.owner?.profile?.organization?.slug === null),
      orgSlug: org,
      teamSlug: (eventWithUserProfiles.calIdTeam?.slug || teamMetadata?.requestedSlug) ?? null,
      name:
        (eventWithUserProfiles.owner?.profile?.organization?.name || eventWithUserProfiles.calIdTeam?.name) ??
        null,
      hideProfileLink: eventWithUserProfiles.calIdTeam?.hideTeamProfileLink ?? false,
      ...(orgDetails
        ? {
            logoUrl: getPlaceholderAvatar(orgDetails?.logoUrl, orgDetails?.name),
            name: orgDetails?.name,
          }
        : {}),
    },
    isDynamic: false,
    isInstantEvent: eventWithUserProfiles.isInstantEvent,
    showInstantEventConnectNowModal,
    instantMeetingParameters: eventWithUserProfiles.instantMeetingParameters,
    aiPhoneCallConfig: eventWithUserProfiles.aiPhoneCallConfig,
    assignAllTeamMembers: event.assignAllTeamMembers,
    disableCancelling: event.disableCancelling,
    disableRescheduling: event.disableRescheduling,
    allowReschedulingCancelledBookings: event.allowReschedulingCancelledBookings,
    interfaceLanguage: event.interfaceLanguage,
  };
}
