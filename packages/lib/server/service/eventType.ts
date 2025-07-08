import type { Prisma } from "@prisma/client";

import type { appDataSchemas } from "@calcom/app-store/apps.schemas.generated";
import { processEventDataShared } from "@calcom/features/eventtypes/lib/getPublicEvent";
import { prisma } from "@calcom/prisma";
import type { User } from "@calcom/prisma/client";
import {
  EventTypeMetaDataSchema,
  EventTypeAppMetadataSchema,
  bookerLayouts as bookerLayoutsSchema,
  eventTypeMetaDataSchemaWithTypedApps,
} from "@calcom/prisma/zod-utils";

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
      eventData.hosts?.map((h) => h.user) ?? []
    );

    const name = team.parent?.name ?? team.name ?? null;
    const isUnpublished = team.parent ? !team.parent.slug : !team.slug;

    const eventMetaData = eventTypeMetaDataSchemaWithTypedApps.parse(eventData.metadata);

    const eventDataShared = await processEventDataShared({
      eventData,
      metadata: eventMetaData,
      prisma,
    });

    return {
      ...eventDataShared,
      profile: {
        username: team.slug,
        name,
        weekStart: eventData.hosts?.[0]?.user?.weekStart || "Monday",
        image: team.parent
          ? getPlaceholderAvatar(team.parent.logoUrl, team.parent.name)
          : getPlaceholderAvatar(team.logoUrl, team.name),
        brandColor: team.brandColor,
        darkBrandColor: team.darkBrandColor,
        theme: team.theme,
        bookerLayouts: bookerLayoutsSchema.parse(eventMetaData?.bookerLayouts || null),
      },
      subsetOfUsers: eventHostsUserData ?? [],
      entity: {
        fromRedirectOfNonOrgLink,
        considerUnpublished: isUnpublished && !fromRedirectOfNonOrgLink,
        orgSlug,
        teamSlug: team.slug ?? null,
        name,
        hideProfileLink: false,
        logoUrl: team.parent
          ? getPlaceholderAvatar(team.parent.logoUrl, team.parent.name)
          : getPlaceholderAvatar(team.logoUrl, team.name),
      },
    };
  }
}
