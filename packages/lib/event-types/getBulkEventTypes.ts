import { getAppFromLocationValue } from "@calcom/app-store/utils";
import { prisma } from "@calcom/prisma";
import { eventTypeLocations as eventTypeLocationsSchema } from "@calcom/prisma/zod-utils";

/**
 * Process event types to add logo information
 * @param eventTypes - The event types to process
 */
const processEventTypes = (eventTypes: { id: number; title: string; locations: unknown }[]) => {
  const eventTypesWithLogo = eventTypes.map((eventType) => {
    const locationParsed = eventTypeLocationsSchema.safeParse(eventType.locations);

    // some events has null as location for legacy reasons, so this fallbacks to daily video
    const app = getAppFromLocationValue(
      locationParsed.success && locationParsed.data?.[0]?.type
        ? locationParsed.data[0].type
        : "integrations:daily"
    );
    return {
      ...eventType,
      logo: app?.logo,
    };
  });

  return {
    eventTypes: eventTypesWithLogo,
  };
};

export const getBulkUserEventTypes = async (userId: number) => {
  const eventTypes = await prisma.eventType.findMany({
    where: {
      userId: userId,
      teamId: null,
    },
    select: {
      id: true,
      title: true,
      locations: true,
    },
  });

  return processEventTypes(eventTypes);
};

export const getBulkTeamEventTypes = async (teamId: number) => {
  const eventTypes = await prisma.eventType.findMany({
    where: {
      userId: null,
      teamId: teamId,
    },
    select: {
      id: true,
      title: true,
      locations: true,
    },
  });

  return processEventTypes(eventTypes);
};
