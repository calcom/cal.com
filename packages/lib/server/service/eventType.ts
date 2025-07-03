import type { Prisma } from "@prisma/client";

import type { appDataSchemas } from "@calcom/app-store/apps.schemas.generated";
import { prisma } from "@calcom/prisma";
import type { User } from "@calcom/prisma/client";
import { EventTypeMetaDataSchema, EventTypeAppMetadataSchema } from "@calcom/prisma/zod-utils";

import { getPlaceholderAvatar } from "../../defaultAvatarImage";
import type { TeamWithEventTypes } from "./team";

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

  static async processEventDataForBooking({
    team,
    orgSlug,
    fromRedirectOfNonOrgLink,
  }: {
    team: TeamWithEventTypes;
    orgSlug: string | null;
    fromRedirectOfNonOrgLink: boolean;
  }) {
    if (!team?.eventTypes?.[0]) {
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
      profile: {
        image: team.parent
          ? getPlaceholderAvatar(team.parent.logoUrl, team.parent.name)
          : getPlaceholderAvatar(team.logoUrl, team.name),
        name,
        username: orgSlug ?? null,
      },
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
}
