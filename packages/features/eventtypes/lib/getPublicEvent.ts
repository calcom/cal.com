import type { User } from "@prisma/client";
import { Prisma } from "@prisma/client";

import type { LocationObject } from "@calcom/app-store/locations";
import { privacyFilteredLocations } from "@calcom/app-store/locations";
import { getAppFromSlug } from "@calcom/app-store/utils";
import { getBookingFieldsWithSystemFields } from "@calcom/features/bookings/lib/getBookingFields";
import { isRecurringEvent, parseRecurringEvent } from "@calcom/lib";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { getDefaultEvent } from "@calcom/lib/defaultEvents";
import { markdownToSafeHTML } from "@calcom/lib/markdownToSafeHTML";
import type { PrismaClient } from "@calcom/prisma/client";
import {
  EventTypeMetaDataSchema,
  customInputSchema,
  userMetadata as userMetadataSchema,
} from "@calcom/prisma/zod-utils";

const publicEventSelect = Prisma.validator<Prisma.EventTypeSelect>()({
  id: true,
  title: true,
  description: true,
  eventName: true,
  slug: true,
  schedulingType: true,
  length: true,
  locations: true,
  customInputs: true,
  disableGuests: true,
  // @TODO: Could this contain sensitive data?
  metadata: true,
  requiresConfirmation: true,
  recurringEvent: true,
  price: true,
  currency: true,
  seatsPerTimeSlot: true,
  bookingFields: true,
  team: true,
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
        select: {
          username: true,
          name: true,
          weekStart: true,
          brandColor: true,
          darkBrandColor: true,
        },
      },
    },
  },
  owner: true,
});

export const getPublicEvent = async (username: string, eventSlug: string, prisma: PrismaClient) => {
  const usernameList = username.split("+");

  // In case of dynamic group event, we fetch user's data and use the default event.
  if (usernameList.length > 1) {
    const users = await prisma.user.findMany({
      where: {
        username: {
          in: usernameList,
        },
      },
      select: {
        username: true,
        name: true,
        weekStart: true,
        metadata: true,
        brandColor: true,
        darkBrandColor: true,
      },
    });

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

    return {
      ...defaultEvent,
      bookingFields: getBookingFieldsWithSystemFields(defaultEvent),
      // Clears meta data since we don't want to send this in the public api.
      users: users.map((user) => ({ ...user, metadata: undefined })),
      locations: privacyFilteredLocations(locations),
      profile: {
        username: users[0].username,
        name: users[0].name,
        weekStart: users[0].weekStart,
        image: `${WEBAPP_URL}/${users[0].username}/avatar.png`,
        brandColor: users[0].brandColor,
        darkBrandColor: users[0].darkBrandColor,
      },
    };
  }

  // In case it's not a group event, it's either a single user or a team, and we query that data.
  const event = await prisma.eventType.findFirst({
    where: {
      slug: eventSlug,
      OR: [
        {
          users: {
            some: {
              username,
            },
          },
        },
        {
          team: {
            slug: username,
          },
        },
      ],
    },
    select: publicEventSelect,
  });

  if (!event) return null;

  return {
    ...event,
    description: markdownToSafeHTML(event.description),
    metadata: EventTypeMetaDataSchema.parse(event.metadata || {}),
    customInputs: customInputSchema.array().parse(event.customInputs || []),
    locations: privacyFilteredLocations((event.locations || []) as LocationObject[]),
    bookingFields: getBookingFieldsWithSystemFields(event),
    recurringEvent: isRecurringEvent(event.recurringEvent) ? parseRecurringEvent(event.recurringEvent) : null,
    // Sets user data on profile object for easier access
    profile: getProfileFromEvent(event),
    users: getUsersFromEvent(event),
  };
};

const eventData = Prisma.validator<Prisma.EventTypeArgs>()({
  select: publicEventSelect,
});

type Event = Prisma.EventTypeGetPayload<typeof eventData>;

function getProfileFromEvent(event: Event) {
  const { team, hosts, owner } = event;
  const profile = team || hosts?.[0]?.user || owner;
  if (!profile) throw new Error("Event has no owner");

  const username = "username" in profile ? profile.username : team?.slug;
  if (!username) throw new Error("Event has no username/team slug");
  const weekStart = hosts?.[0]?.user?.weekStart || owner?.weekStart || "Monday";
  const basePath = team ? `/team/${username}` : `/${username}`;

  return {
    username,
    name: profile.name,
    weekStart,
    image: team ? undefined : `${WEBAPP_URL}${basePath}/avatar.png`,
    logo: !team ? undefined : team.logo,
    brandColor: profile.brandColor,
    darkBrandColor: profile.darkBrandColor,
  };
}

function getUsersFromEvent(event: Event) {
  const { team, hosts, owner } = event;
  if (team) {
    return (hosts || []).map(mapHostsToUsers);
  }

  if (!owner) throw new Error("Event has no owner");

  const { username, name, weekStart } = owner;
  return [{ username, name, weekStart }];
}

function mapHostsToUsers(host: { user: Pick<User, "username" | "name" | "weekStart"> }) {
  return {
    username: host.user.username,
    name: host.user.name,
    weekStart: host.user.weekStart,
  };
}
