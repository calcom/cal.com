import type { User as UserType } from "@prisma/client";
import { Prisma } from "@prisma/client";

import type { LocationObject } from "@calcom/app-store/locations";
import { privacyFilteredLocations } from "@calcom/app-store/locations";
import { getAppFromSlug } from "@calcom/app-store/utils";
import dayjs from "@calcom/dayjs";
import { getBookingFieldsWithSystemFields } from "@calcom/features/bookings/lib/getBookingFields";
import { getSlugOrRequestedSlug } from "@calcom/features/ee/organizations/lib/orgDomains";
import { isRecurringEvent, parseRecurringEvent } from "@calcom/lib";
import { getOrgOrTeamAvatar } from "@calcom/lib/defaultAvatarImage";
import { getPlaceholderAvatar } from "@calcom/lib/defaultAvatarImage";
import { getDefaultEvent, getUsernameList } from "@calcom/lib/defaultEvents";
import { getUserAvatarUrl } from "@calcom/lib/getAvatarUrl";
import { getBookerBaseUrlSync } from "@calcom/lib/getBookerUrl/client";
import { markdownToSafeHTML } from "@calcom/lib/markdownToSafeHTML";
import { UserRepository } from "@calcom/lib/server/repository/user";
import type { PrismaClient } from "@calcom/prisma";
import type { Team } from "@calcom/prisma/client";
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
  instantMeetingParameters: true,
  aiPhoneCallConfig: true,
  schedulingType: true,
  length: true,
  locations: true,
  customInputs: true,
  disableGuests: true,
  metadata: true,
  lockTimeZoneToggleOnBookingPage: true,
  requiresConfirmation: true,
  autoTranslateDescriptionEnabled: true,
  fieldTranslations: {
    select: {
      translatedText: true,
      targetLocale: true,
      field: true,
    },
  },
  requiresBookerEmailVerification: true,
  recurringEvent: true,
  price: true,
  currency: true,
  seatsPerTimeSlot: true,
  seatsShowAvailabilityCount: true,
  bookingFields: true,
  teamId: true,
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
      isPrivate: true,
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
  instantMeetingSchedule: {
    select: {
      id: true,
      timeZone: true,
    },
  },

  hidden: true,
  assignAllTeamMembers: true,
  rescheduleWithSameRoundRobinHost: true,
});

export async function isCurrentlyAvailable({
  prisma,
  instantMeetingScheduleId,
  availabilityTimezone,
  length,
}: {
  prisma: PrismaClient;
  instantMeetingScheduleId: number;
  availabilityTimezone: string;
  length: number;
}): Promise<boolean> {
  const now = dayjs().tz(availabilityTimezone);
  const currentDay = now.day();
  const meetingEndTime = now.add(length, "minute");

  const res = await prisma.schedule.findUniqueOrThrow({
    where: {
      id: instantMeetingScheduleId,
    },
    select: {
      availability: true,
    },
  });

  const dateOverride = res.availability.find((a) => a.date && dayjs(a.date).isSame(now, "day"));

  if (dateOverride) {
    return !isAvailableInTimeSlot(dateOverride, now, meetingEndTime);
  }

  for (const availability of res.availability) {
    if (!availability.date && availability.days.includes(currentDay)) {
      const isAvailable = isAvailableInTimeSlot(availability, now, meetingEndTime);
      if (isAvailable) {
        return true;
      }
    }
  }

  return false;
}

function isAvailableInTimeSlot(
  availability: { startTime: Date; endTime: Date; days: number[] },
  now: dayjs.Dayjs,
  meetingEndTime: dayjs.Dayjs
): boolean {
  const startTime = dayjs(availability.startTime).utc().format("HH:mm");
  const endTime = dayjs(availability.endTime).utc().format("HH:mm");

  const periodStart = now
    .startOf("day")
    .hour(parseInt(startTime.split(":")[0]))
    .minute(parseInt(startTime.split(":")[1]));
  const periodEnd = now
    .startOf("day")
    .hour(parseInt(endTime.split(":")[0]))
    .minute(parseInt(endTime.split(":")[1]));

  const isWithinPeriod =
    now.isBetween(periodStart, periodEnd, null, "[)") &&
    meetingEndTime.isBetween(periodStart, periodEnd, null, "(]");

  return isWithinPeriod;
}

// TODO: Convert it to accept a single parameter with structured data
export const getPublicEvent = async (
  username: string,
  eventSlug: string,
  isTeamEvent: boolean | undefined,
  org: string | null,
  prisma: PrismaClient,
  fromRedirectOfNonOrgLink: boolean,
  currentUserId?: number
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

    let orgDetails: Pick<Team, "logoUrl" | "name"> | undefined;
    if (org) {
      orgDetails = await prisma.team.findFirstOrThrow({
        where: {
          slug: org,
        },
        select: {
          logoUrl: true,
          name: true,
        },
      });
    }

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
        weekStart: users[0].weekStart,
        brandColor: users[0].brandColor,
        darkBrandColor: users[0].darkBrandColor,
        theme: null,
        bookerLayouts: bookerLayoutsSchema.parse(
          firstUsersMetadata?.defaultBookerLayouts || defaultEventBookerLayouts
        ),
        ...(orgDetails
          ? {
              image: getPlaceholderAvatar(orgDetails?.logoUrl, orgDetails?.name),
              name: orgDetails?.name,
              username: org,
            }
          : {}),
      },
      entity: {
        considerUnpublished: !fromRedirectOfNonOrgLink && unPublishedOrgUser !== undefined,
        fromRedirectOfNonOrgLink,
        orgSlug: org,
        name: unPublishedOrgUser?.profile?.organization?.name ?? null,
        teamSlug: null,
        logoUrl: null,
      },
      isInstantEvent: false,
      instantMeetingParameters: [],
      showInstantEventConnectNowModal: false,
      autoTranslateDescriptionEnabled: false,
      fieldTranslations: [],
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
                  profiles: { none: {} },
                }),
          },
        },
        team: null,
      };

  // In case it's not a group event, it's either a single user or a team, and we query that data.
  let event = await prisma.eventType.findFirst({
    where: {
      slug: eventSlug,
      ...usersOrTeamQuery,
    },
    select: publicEventSelect,
  });

  // If no event was found, check for platform org user event
  if (!event && !orgQuery) {
    event = await prisma.eventType.findFirst({
      where: {
        slug: eventSlug,
        users: {
          some: {
            username,
            isPlatformManaged: false,
            movedToProfile: {
              organization: {
                isPlatform: true,
              },
            },
          },
        },
      },
      select: publicEventSelect,
    });
  }

  if (!event) return null;

  const eventMetaData = EventTypeMetaDataSchema.parse(event.metadata || {});
  const teamMetadata = teamMetadataSchema.parse(event.team?.metadata || {});
  const usersAsHosts = event.hosts.map((host) => host.user);

  // Enrich users in a single batch call
  const enrichedUsers = await UserRepository.enrichUsersWithTheirProfiles(usersAsHosts);

  // Map enriched users back to the hosts
  const hosts = event.hosts.map((host, index) => ({
    ...host,
    user: enrichedUsers[index],
  }));

  const eventWithUserProfiles = {
    ...event,
    owner: event.owner
      ? await UserRepository.enrichUserWithItsProfile({
          user: event.owner,
        })
      : null,
    hosts: hosts,
  };

  let users =
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

  let orgDetails: Pick<Team, "logoUrl" | "name"> | undefined | null;
  if (org) {
    orgDetails = await prisma.team.findFirst({
      where: {
        slug: org,
      },
      select: {
        logoUrl: true,
        name: true,
      },
    });
  }

  let showInstantEventConnectNowModal = eventWithUserProfiles.isInstantEvent;

  if (eventWithUserProfiles.isInstantEvent && eventWithUserProfiles.instantMeetingSchedule?.id) {
    const { id, timeZone } = eventWithUserProfiles.instantMeetingSchedule;

    showInstantEventConnectNowModal = await isCurrentlyAvailable({
      prisma,
      instantMeetingScheduleId: id,
      availabilityTimezone: timeZone ?? "Europe/London",
      length: eventWithUserProfiles.length,
    });
  }
  const isTeamAdminOrOwner = await prisma.membership.findFirst({
    where: {
      userId: currentUserId ?? -1,
      teamId: event.teamId ?? -1,
      accepted: true,
      role: { in: ["ADMIN", "OWNER"] },
    },
  });

  const isOrgAdminOrOwner = await prisma.membership.findFirst({
    where: {
      userId: currentUserId ?? -1,
      teamId: event.team?.parentId ?? -1,
      accepted: true,
      role: { in: ["ADMIN", "OWNER"] },
    },
  });

  if (event.team?.isPrivate && !isTeamAdminOrOwner && !isOrgAdminOrOwner) {
    users = [];
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

  // Batch enrich users in a single call
  const enrichedUsers = await UserRepository.enrichUsersWithTheirProfiles(users);

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
