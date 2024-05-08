import type { User as UserType } from "@prisma/client";
import { Prisma } from "@prisma/client";

import type { LocationObject } from "@calcom/app-store/locations";
import { privacyFilteredLocations } from "@calcom/app-store/locations";
import { getAppFromSlug } from "@calcom/app-store/utils";
import { getBookingFieldsWithSystemFields } from "@calcom/features/bookings/lib/getBookingFields";
import { getSlugOrRequestedSlug } from "@calcom/features/ee/organizations/lib/orgDomains";
import { isRecurringEvent, parseRecurringEvent } from "@calcom/lib";
import { getOrgOrTeamAvatar } from "@calcom/lib/defaultAvatarImage";
import { getDefaultEvent, getUsernameList } from "@calcom/lib/defaultEvents";
import { getUserAvatarUrl } from "@calcom/lib/getAvatarUrl";
import { getBookerBaseUrlSync } from "@calcom/lib/getBookerUrl/client";
import { markdownToSafeHTML } from "@calcom/lib/markdownToSafeHTML";
import { UserRepository } from "@calcom/lib/server/repository/user";
import type { PrismaClient } from "@calcom/prisma";
import type { BookerLayoutSettings } from "@calcom/prisma/zod-utils";
import {
  BookerLayouts,
  EventTypeMetaDataSchema,
  bookerLayoutOptions,
  bookerLayouts as bookerLayoutsSchema,
  customInputSchema,
  teamMetadataSchema,
  userMetadata as userMetadataSchema,
} from "@calcom/prisma/zod-utils";
import type { UserProfile } from "@calcom/types/UserProfile";

const userSelect = Prisma.validator<Prisma.UserSelect>()({
  id: true,
  avatarUrl: true,
  username: true,
  name: true,
  weekStart: true,
  brandColor: true,
  darkBrandColor: true,
  theme: true,
  metadata: true,
  organization: {
    select: {
      id: true,
      name: true,
      slug: true,
      calVideoLogo: true,
      bannerUrl: true,
    },
  },
  defaultScheduleId: true,
});

const publicEventSelect = Prisma.validator<Prisma.EventTypeSelect>()({
  id: true,
  title: true,
  description: true,
  eventName: true,
  slug: true,
  isInstantEvent: true,
  aiPhoneCallConfig: true,
  schedulingType: true,
  length: true,
  locations: true,
  customInputs: true,
  disableGuests: true,
  metadata: true,
  lockTimeZoneToggleOnBookingPage: true,
  requiresConfirmation: true,
  requiresBookerEmailVerification: true,
  recurringEvent: true,
  price: true,
  currency: true,
  seatsPerTimeSlot: true,
  seatsShowAvailabilityCount: true,
  bookingFields: true,
  team: {
    select: {
      parentId: true,
      metadata: true,
      brandColor: true,
      darkBrandColor: true,
      slug: true,
      name: true,
      logoUrl: true,
      theme: true,
      parent: {
        select: {
          slug: true,
          name: true,
          bannerUrl: true,
          logoUrl: true,
        },
      },
    },
  },
  successRedirectUrl: true,
  forwardParamsSuccessRedirect: true,
  workflows: {
    include: {
      workflow: {
        include: {
          steps: true,
        },
      },
    },
  },
  hosts: {
    select: {
      user: {
        select: userSelect,
      },
    },
  },
  owner: {
    select: userSelect,
  },
  schedule: {
    select: {
      id: true,
      timeZone: true,
    },
  },
  hidden: true,
  assignAllTeamMembers: true,
});

// TODO: Convert it to accept a single parameter with structured data
export const getPublicEvent = async (
  username: string,
  eventSlug: string,
  isTeamEvent: boolean | undefined,
  org: string | null,
  prisma: PrismaClient,
  fromRedirectOfNonOrgLink: boolean
) => {
  const usernameList = getUsernameList(username);
  const orgQuery = org ? getSlugOrRequestedSlug(org) : null;
  // In case of dynamic group event, we fetch user's data and use the default event.
  if (usernameList.length > 1) {
    const usersInOrgContext = await UserRepository.findUsersByUsername({
      usernameList,
      orgSlug: org,
    });
    const users = usersInOrgContext;

    const defaultEvent = getDefaultEvent(eventSlug);
    let locations = defaultEvent.locations ? (defaultEvent.locations as LocationObject[]) : [];

    // Get the prefered location type from the first user
    const firstUsersMetadata = userMetadataSchema.parse(users[0].metadata || {});
    const preferedLocationType = firstUsersMetadata?.defaultConferencingApp;

    if (preferedLocationType?.appSlug) {
      const foundApp = getAppFromSlug(preferedLocationType.appSlug);
      const appType = foundApp?.appData?.location?.type;
      if (appType) {
        // Replace the location with the prefered location type
        // This will still be default to daily if the app is not found
        locations = [{ type: appType, link: preferedLocationType.appLink }] as LocationObject[];
      }
    }

    const defaultEventBookerLayouts = {
      enabledLayouts: [...bookerLayoutOptions],
      defaultLayout: BookerLayouts.MONTH_VIEW,
    } as BookerLayoutSettings;
    const disableBookingTitle = !defaultEvent.isDynamic;
    const unPublishedOrgUser = users.find((user) => user.profile?.organization?.slug === null);

    return {
      ...defaultEvent,
      bookingFields: getBookingFieldsWithSystemFields({ ...defaultEvent, disableBookingTitle }),
      // Clears meta data since we don't want to send this in the public api.
      users: users.map((user) => ({
        ...user,
        metadata: undefined,
        bookerUrl: getBookerBaseUrlSync(user.profile?.organization?.slug ?? null),
      })),
      locations: privacyFilteredLocations(locations),
      profile: {
        username: users[0].username,
        name: users[0].name,
        weekStart: users[0].weekStart,
        image: getUserAvatarUrl({
          avatarUrl: users[0].avatarUrl,
        }),
        brandColor: users[0].brandColor,
        darkBrandColor: users[0].darkBrandColor,
        theme: null,
        bookerLayouts: bookerLayoutsSchema.parse(
          firstUsersMetadata?.defaultBookerLayouts || defaultEventBookerLayouts
        ),
      },
      entity: {
        considerUnpublished: !fromRedirectOfNonOrgLink && unPublishedOrgUser !== undefined,
        fromRedirectOfNonOrgLink,
        orgSlug: org,
        name: unPublishedOrgUser?.profile?.organization?.name ?? null,
      },
      isInstantEvent: false,
    };
  }

  const usersOrTeamQuery = isTeamEvent
    ? {
        team: {
          ...getSlugOrRequestedSlug(username),
          parent: orgQuery,
        },
      }
    : {
        users: {
          some: {
            ...(orgQuery
              ? {
                  profiles: {
                    some: {
                      organization: orgQuery,
                      username: username,
                    },
                  },
                }
              : {
                  username,
                }),
          },
        },
        team: null,
      };

  // In case it's not a group event, it's either a single user or a team, and we query that data.
  const event = await prisma.eventType.findFirst({
    where: {
      slug: eventSlug,
      ...usersOrTeamQuery,
    },
    select: publicEventSelect,
  });

  if (!event) return null;

  const eventMetaData = EventTypeMetaDataSchema.parse(event.metadata || {});
  const teamMetadata = teamMetadataSchema.parse(event.team?.metadata || {});
  const hosts = [];
  for (const host of event.hosts) {
    hosts.push({
      ...host,
      user: await UserRepository.enrichUserWithItsProfile({
        user: host.user,
      }),
    });
  }

  const eventWithUserProfiles = {
    ...event,
    owner: event.owner
      ? await UserRepository.enrichUserWithItsProfile({
          user: event.owner,
        })
      : null,
    hosts: hosts,
  };

  const users =
    (await getUsersFromEvent(eventWithUserProfiles, prisma)) ||
    (await getOwnerFromUsersArray(prisma, event.id));

  if (users === null) {
    throw new Error("Event has no owner");
  }
  //In case the event schedule is not defined ,use the event owner's default schedule
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
  return {
    ...eventWithUserProfiles,
    bookerLayouts: bookerLayoutsSchema.parse(eventMetaData?.bookerLayouts || null),
    description: markdownToSafeHTML(eventWithUserProfiles.description),
    metadata: eventMetaData,
    customInputs: customInputSchema.array().parse(event.customInputs || []),
    locations: privacyFilteredLocations((eventWithUserProfiles.locations || []) as LocationObject[]),
    bookingFields: getBookingFieldsWithSystemFields(event),
    recurringEvent: isRecurringEvent(eventWithUserProfiles.recurringEvent)
      ? parseRecurringEvent(event.recurringEvent)
      : null,
    // Sets user data on profile object for easier access
    profile: getProfileFromEvent(eventWithUserProfiles),
    users,
    entity: {
      fromRedirectOfNonOrgLink,
      considerUnpublished:
        !fromRedirectOfNonOrgLink &&
        (eventWithUserProfiles.team?.slug === null ||
          eventWithUserProfiles.owner?.profile?.organization?.slug === null ||
          eventWithUserProfiles.team?.parent?.slug === null),
      orgSlug: org,
      teamSlug: (eventWithUserProfiles.team?.slug || teamMetadata?.requestedSlug) ?? null,
      name:
        (eventWithUserProfiles.owner?.profile?.organization?.name ||
          eventWithUserProfiles.team?.parent?.name ||
          eventWithUserProfiles.team?.name) ??
        null,
    },
    isDynamic: false,
    isInstantEvent: eventWithUserProfiles.isInstantEvent,
    aiPhoneCallConfig: eventWithUserProfiles.aiPhoneCallConfig,
    assignAllTeamMembers: event.assignAllTeamMembers,
  };
};

const eventData = Prisma.validator<Prisma.EventTypeArgs>()({
  select: publicEventSelect,
});

type Event = Prisma.EventTypeGetPayload<typeof eventData>;

function getProfileFromEvent(event: Event) {
  const { team, hosts, owner } = event;
  const nonTeamprofile = hosts?.[0]?.user || owner;
  const profile = team || nonTeamprofile;
  if (!profile) throw new Error("Event has no owner");

  const username = "username" in profile ? profile.username : team?.slug;
  const weekStart = hosts?.[0]?.user?.weekStart || owner?.weekStart || "Monday";
  const eventMetaData = EventTypeMetaDataSchema.parse(event.metadata || {});
  const userMetaData = userMetadataSchema.parse(profile.metadata || {});

  return {
    username,
    name: profile.name,
    weekStart,
    image: team
      ? getOrgOrTeamAvatar(team)
      : getUserAvatarUrl({
          avatarUrl: nonTeamprofile?.avatarUrl,
        }),
    brandColor: profile.brandColor,
    darkBrandColor: profile.darkBrandColor,
    theme: profile.theme,
    bookerLayouts: bookerLayoutsSchema.parse(
      eventMetaData?.bookerLayouts ||
        (userMetaData && "defaultBookerLayouts" in userMetaData ? userMetaData.defaultBookerLayouts : null)
    ),
  };
}
async function getUsersFromEvent(
  event: Omit<Event, "owner" | "hosts"> & {
    owner:
      | (Event["owner"] & {
          profile: UserProfile;
        })
      | null;
    hosts: (Omit<Event["hosts"][number], "user"> & {
      user: Event["hosts"][number]["user"] & {
        profile: UserProfile;
      };
    })[];
  },
  prisma: PrismaClient
) {
  const { team, hosts, owner, id } = event;
  if (team) {
    // getOwnerFromUsersArray is used here for backward compatibility when team event type has users[] but not hosts[]
    return hosts.length
      ? hosts.filter((host) => host.user.username).map(mapHostsToUsers)
      : (await getOwnerFromUsersArray(prisma, id)) ?? [];
  }
  if (!owner) {
    return null;
  }
  const { username, name, weekStart, profile, avatarUrl } = owner;
  const organizationId = profile?.organization?.id ?? null;
  return [
    {
      username,
      name,
      weekStart,
      organizationId,
      avatarUrl,
      profile,
      bookerUrl: getBookerBaseUrlSync(owner.profile?.organization?.slug ?? null),
    },
  ];
}

async function getOwnerFromUsersArray(prisma: PrismaClient, eventTypeId: number) {
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
  const usersWithUserProfile = [];
  for (const user of users) {
    const { profile } = await UserRepository.enrichUserWithItsProfile({
      user: user,
    });
    usersWithUserProfile.push({
      ...user,
      organizationId: profile?.organization?.id ?? null,
      organization: profile?.organization,
      profile,
    });
  }
  return [
    {
      ...usersWithUserProfile[0],
      bookerUrl: getBookerBaseUrlSync(usersWithUserProfile[0].organization?.slug ?? null),
    },
  ];
}

function mapHostsToUsers(host: {
  user: Pick<UserType, "username" | "name" | "weekStart" | "avatarUrl"> & {
    profile: UserProfile;
  };
}) {
  return {
    username: host.user.username,
    name: host.user.name,
    avatarUrl: host.user.avatarUrl,
    weekStart: host.user.weekStart,
    organizationId: host.user.profile?.organizationId ?? null,
    bookerUrl: getBookerBaseUrlSync(host.user.profile?.organization?.slug ?? null),
    profile: host.user.profile,
  };
}
