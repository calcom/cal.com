import { getShouldServeCache } from "@calcom/features/calendar-cache/lib/getShouldServeCache";
import { GOOGLE_CALENDAR_TYPE } from "@calcom/platform-constants";
import prisma from "@calcom/prisma";

interface CacheEligibilityParams {
  user: string | string[] | undefined;
  type: string | string[] | undefined;
  org?: string | string[] | null;
}

export async function checkCacheEligibility(params: CacheEligibilityParams): Promise<boolean> {
  try {
    const username = Array.isArray(params.user) ? params.user[0] : params.user;
    const eventSlug = Array.isArray(params.type) ? params.type[0] : params.type;
    const org = Array.isArray(params.org) ? params.org[0] : params.org;

    if (!username || !eventSlug) {
      return false;
    }

    const eventType = await prisma.eventType.findFirst({
      where: {
        slug: eventSlug,
        OR: [
          {
            team: {
              slug: username,
              ...(org ? { parent: { slug: org } } : {}),
            },
          },
          {
            users: {
              some: {
                username,
                ...(org
                  ? {
                      profiles: {
                        some: {
                          organization: { slug: org },
                          username: username,
                        },
                      },
                    }
                  : {
                      profiles: { none: {} },
                    }),
              },
            },
            team: null,
          },
        ],
      },
      select: {
        id: true,
        teamId: true,
        useEventLevelSelectedCalendars: true,
        team: {
          select: {
            id: true,
            parentId: true,
          },
        },
        owner: {
          select: {
            id: true,
            selectedCalendars: {
              select: {
                integration: true,
                eventTypeId: true,
              },
            },
            profiles: {
              select: {
                organizationId: true,
              },
            },
          },
        },
        hosts: {
          select: {
            user: {
              select: {
                id: true,
                selectedCalendars: {
                  select: {
                    integration: true,
                    eventTypeId: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!eventType) return false;

    const teamId = eventType.teamId || eventType.owner?.profiles?.[0]?.organizationId;
    const shouldServeCache = await getShouldServeCache(undefined, teamId);

    if (!shouldServeCache) return false;

    let selectedCalendars: Array<{ integration: string; eventTypeId: number | null }> = [];

    if (eventType.useEventLevelSelectedCalendars) {
      if (eventType.owner) {
        selectedCalendars = eventType.owner.selectedCalendars.filter(
          (calendar) => calendar.eventTypeId === eventType.id
        );
      }
      for (const host of eventType.hosts) {
        const hostEventCalendars = host.user.selectedCalendars.filter(
          (calendar) => calendar.eventTypeId === eventType.id
        );
        selectedCalendars.push(...hostEventCalendars);
      }
    } else {
      if (eventType.owner) {
        selectedCalendars = eventType.owner.selectedCalendars.filter(
          (calendar) => calendar.eventTypeId === null
        );
      }
      for (const host of eventType.hosts) {
        const hostUserCalendars = host.user.selectedCalendars.filter(
          (calendar) => calendar.eventTypeId === null
        );
        selectedCalendars.push(...hostUserCalendars);
      }
    }

    if (selectedCalendars.length === 0) return false;

    return selectedCalendars.every((calendar) => calendar.integration === GOOGLE_CALENDAR_TYPE);
  } catch (error) {
    console.error("Error checking ISR caching eligibility:", error);
    return false;
  }
}
