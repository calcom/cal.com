import type { Prisma } from "@prisma/client";

import type { appDataSchemas } from "@calcom/app-store/apps.schemas.generated";
import { prisma } from "@calcom/prisma";
import type { User } from "@calcom/prisma/client";
import { EventTypeMetaDataSchema, EventTypeAppMetadataSchema } from "@calcom/prisma/zod-utils";

import type { TeamWithEventTypes } from "./team";

export interface ProcessedEventData {
  eventTypeId: number;
  entity: {
    fromRedirectOfNonOrgLink: boolean;
    considerUnpublished: boolean;
    orgSlug: string | null;
    teamSlug: string | null;
    name: string | null;
  };
  length: number;
  metadata: any;
  profile: {
    image: string;
    name: string | null;
    username: string | null;
  };
  title: string;
  users: Array<{
    username: string;
    name: string;
  }>;
  hidden: boolean;
  interfaceLanguage: string | null;
  slug: string;
  disableRescheduling: boolean;
  allowReschedulingCancelledBookings: boolean;
  team: {
    id: number;
    name: string | null;
    slug: string | null;
  };
}

export class EventTypeService {
  static async getEventTypeAppDataFromId(eventTypeId: number, appSlug: keyof typeof appDataSchemas) {
    const eventType = await prisma.eventType.findUnique({
      where: {
        id: eventTypeId,
      },
      select: {
        metadata: true,
      },
    });

    if (!eventType) return null;

    return this.getEventTypeAppDataFromMetadata(eventType.metadata, appSlug);
  }

  static getEventTypeAppDataFromMetadata(metadata: Prisma.JsonValue, appSlug: keyof typeof appDataSchemas) {
    const parseEventTypeAppMetadata = EventTypeMetaDataSchema.safeParse(metadata);

    if (!parseEventTypeAppMetadata.success || !parseEventTypeAppMetadata.data?.apps) return null;

    const eventTypeAppMetadata = parseEventTypeAppMetadata.data.apps;
    const apps = EventTypeAppMetadataSchema.parse(eventTypeAppMetadata);
    const appMetadata = apps[appSlug];

    return appMetadata;
  }

  /**
   * Gets users data for event types - should NOT be cached as it's user context dependent
   */
  static async getEventTypeUsersData(
    isPrivateTeam: boolean,
    eventTypeId: number,
    users: Pick<User, "username" | "name">[]
  ): Promise<Array<{ username: string; name: string }>> {
    if (!isPrivateTeam && users.length > 0) {
      return users
        .filter((user) => user.username)
        .map((user) => ({
          username: user.username ?? "",
          name: user.name ?? "",
        }));
    }

    if (!isPrivateTeam && users.length === 0) {
      const { users: data } = await prisma.eventType.findUniqueOrThrow({
        where: { id: eventTypeId },
        select: {
          users: {
            take: 1,
            select: {
              username: true,
              name: true,
            },
          },
        },
      });

      return data.length > 0
        ? [
            {
              username: data[0].username ?? "",
              name: data[0].name ?? "",
            },
          ]
        : [];
    }

    return [];
  }

  /**
   * Processes event data for booking page - can be cached as event data changes infrequently
   */
  static async processEventDataForBooking(
    team: TeamWithEventTypes,
    orgSlug: string | null,
    profileData: { image: string; name: string | null; username: string | null },
    fromRedirectOfNonOrgLink: boolean
  ): Promise<ProcessedEventData | null> {
    if (!team.eventTypes?.[0]) {
      return null;
    }

    const eventData = team.eventTypes[0];
    const eventTypeId = eventData.id;

    const eventHostsUserData = await this.getEventTypeUsersData(
      team.isPrivate,
      eventTypeId,
      eventData.hosts.map((h) => h.user)
    );

    const name = team.parent?.name ?? team.name ?? null;

    // Calculate unpublished state - critical for org redirections
    const isUnpublished = team.parent ? !team.parent.slug : !team.slug;

    return {
      eventTypeId,
      entity: {
        fromRedirectOfNonOrgLink,
        considerUnpublished: isUnpublished && !fromRedirectOfNonOrgLink,
        orgSlug,
        teamSlug: team.slug ?? null,
        name,
      },
      length: eventData.length,
      metadata: EventTypeMetaDataSchema.parse(eventData.metadata),
      profile: profileData,
      title: eventData.title,
      users: eventHostsUserData,
      hidden: eventData.hidden ?? false,
      interfaceLanguage: eventData.interfaceLanguage,
      slug: eventData.slug,
      disableRescheduling: eventData.disableRescheduling ?? false,
      allowReschedulingCancelledBookings: eventData.allowReschedulingCancelledBookings ?? false,
      team: {
        id: team.id,
        name: team.name,
        slug: team.slug,
      },
    };
  }

  /**
   * Validates event type rescheduling restrictions - not cached as it depends on specific booking state
   */
  static canReschedule(eventData: ProcessedEventData, rescheduleUid?: string | string[]): boolean {
    return !(rescheduleUid && eventData.disableRescheduling);
  }

  /**
   * Validates cancelled booking rescheduling - not cached as it depends on booking state
   */
  static canRescheduleCancelledBooking(
    eventData: ProcessedEventData,
    allowRescheduleForCancelledBooking: boolean
  ): boolean {
    return allowRescheduleForCancelledBooking || eventData.allowReschedulingCancelledBookings;
  }
}
