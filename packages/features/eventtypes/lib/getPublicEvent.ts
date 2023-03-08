import type { LocationObject } from "@calcom/app-store/locations";
import { privacyFilteredLocations } from "@calcom/app-store/locations";
import { getAppFromSlug } from "@calcom/app-store/utils";
import { getBookingFieldsWithSystemFields } from "@calcom/features/bookings/lib/getBookingFields";
import { isRecurringEvent, parseRecurringEvent } from "@calcom/lib";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { getDefaultEvent } from "@calcom/lib/defaultEvents";
import type { PrismaClient } from "@calcom/prisma/client";
import {
  EventTypeMetaDataSchema,
  customInputSchema,
  userMetadata as userMetadataSchema,
} from "@calcom/prisma/zod-utils";

const publicEventSelect = {
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
  workflows: {
    include: {
      workflow: {
        include: {
          steps: true,
        },
      },
    },
  },

  users: {
    select: {
      username: true,
      name: true,
      weekStart: true,
    },
  },
};

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
      // Clears meta data since we don't want to send this in the public api.
      users: users.map((user) => ({ ...user, metadata: undefined })),
      locations: privacyFilteredLocations(locations),
    };
  }

  // In case it's not a group event, it's either a single user or a team, and we query that data.
  const event = await prisma.eventType.findFirst({
    where: {
      AND: [
        {
          OR: [
            {
              users: {
                some: {
                  username: username,
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
        {
          slug: eventSlug,
        },
      ],
    },
    select: publicEventSelect,
  });

  if (!event) return null;

  return {
    ...event,
    metadata: EventTypeMetaDataSchema.parse(event.metadata || {}),
    customInputs: customInputSchema.array().parse(event.customInputs || []),
    locations: privacyFilteredLocations((event.locations || []) as LocationObject[]),
    bookingFields: getBookingFieldsWithSystemFields(event),
    recurringEvent: isRecurringEvent(event.recurringEvent) ? parseRecurringEvent(event.recurringEvent) : null,
    // Unset workflows since we don't want to send this in the public api.
    workflows: undefined,
    // Sets user data on profile object for easier access
    profile: {
      username: event.users[0].username,
      name: event.users[0].name,
      weekStart: event.users[0].weekStart,
      image: `${WEBAPP_URL}/${event.users[0].username}/avatar.png`,
    },
  };
};
