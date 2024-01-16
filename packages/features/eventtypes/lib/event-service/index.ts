import type { User } from "@prisma/client";
import { getBookingFieldsWithSystemFields } from "bookings/lib/getBookingFields";
import { getSlugOrRequestedSlug } from "ee/organizations/lib/orgDomains";
import { dynamicEventSelector, publicEventSelector } from "eventtypes/lib/event-service/validators";

import { privacyFilteredLocations, type LocationObject } from "@calcom/app-store/locations";
import { getAppFromSlug } from "@calcom/app-store/utils";
import { isRecurringEvent, parseRecurringEvent } from "@calcom/lib";
import { getDefaultEvent, getUsernameList } from "@calcom/lib/defaultEvents";
import { getBookerBaseUrlSync } from "@calcom/lib/getBookerUrl/client";
import { markdownToSafeHTML } from "@calcom/lib/markdownToSafeHTML";
import type { PrismaClient } from "@calcom/prisma";
import type { BookerLayoutSettings } from "@calcom/prisma/zod-utils";
import {
  BookerLayouts,
  EventTypeMetaDataSchema,
  bookerLayoutOptions,
  bookerLayouts,
  customInputSchema,
  teamMetadataSchema,
  userMetadata,
} from "@calcom/prisma/zod-utils";

import type { Event } from "./validators";

export class EventService {
  constructor(private readonly prismaClient: PrismaClient) {}

  async getPublicEvent(
    username: string,
    eventSlug: string,
    isTeamEvent: boolean | undefined,
    org: string | null
  ) {
    const usernameList = getUsernameList(username);
    if (usernameList.length > 1) {
      return this.getDynamicEvent(usernameList, eventSlug, org);
    }

    return this._getPublicEvent(username, eventSlug, isTeamEvent, org);
  }

  private async _getPublicEvent(
    username: string,
    eventSlug: string,
    isTeamEvent: boolean | undefined,
    org: string | null
  ) {
    const orgQuery = org ? getSlugOrRequestedSlug(org) : null;
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
              username,
              organization: orgQuery,
            },
          },
          team: null,
        };

    const event = await this.prismaClient.eventType.findFirst({
      where: {
        slug: eventSlug,
        ...usersOrTeamQuery,
      },
      select: publicEventSelector,
    });

    if (!event) return null;

    const eventMetaData = EventTypeMetaDataSchema.parse(event.metadata || {});
    const teamMetadata = teamMetadataSchema.parse(event.team?.metadata || {});

    const users = this.getUsersFromEvent(event) || (await this.getOwnerFromUsersArray(event.id));
    if (users === null) {
      throw new Error("Event has no owner");
    }

    return {
      ...event,
      bookerLayouts: bookerLayouts.parse(eventMetaData?.bookerLayouts || null),
      description: markdownToSafeHTML(event.description),
      metadata: eventMetaData,
      customInputs: customInputSchema.array().parse(event.customInputs || []),
      locations: privacyFilteredLocations((event.locations || []) as LocationObject[]),
      bookingFields: getBookingFieldsWithSystemFields(event),
      recurringEvent: isRecurringEvent(event.recurringEvent)
        ? parseRecurringEvent(event.recurringEvent)
        : null,
      // Sets user data on profile object for easier access
      profile: this.getProfileFromEvent(event),
      users,
      entity: {
        isUnpublished:
          event.team?.slug === null ||
          event.owner?.organization?.slug === null ||
          event.team?.parent?.slug === null,
        orgSlug: org,
        teamSlug: (event.team?.slug || teamMetadata?.requestedSlug) ?? null,
        name: (event.owner?.organization?.name || event.team?.parent?.name || event.team?.name) ?? null,
      },
      isDynamic: false,
      isInstantEvent: event.isInstantEvent,
    };
  }

  private getProfileFromEvent(event: Event) {
    const { team, hosts, owner } = event;
    const profile = team || hosts?.[0]?.user || owner;
    if (!profile) throw new Error("Event has no owner");

    const username = "username" in profile ? profile.username : team?.slug;
    const weekStart = hosts?.[0]?.user?.weekStart || owner?.weekStart || "Monday";
    const basePath = team ? `/team/${username}` : `/${username}`;
    const eventMetaData = EventTypeMetaDataSchema.parse(event.metadata || {});
    const userMetaData = userMetadata.parse(profile.metadata || {});

    return {
      username,
      name: profile.name,
      weekStart,
      image: team ? undefined : `${basePath}/avatar.png`,
      logo: !team ? undefined : team.logo,
      brandColor: profile.brandColor,
      darkBrandColor: profile.darkBrandColor,
      theme: profile.theme,
      bookerLayouts: bookerLayouts.parse(
        eventMetaData?.bookerLayouts ||
          (userMetaData && "defaultBookerLayouts" in userMetaData ? userMetaData.defaultBookerLayouts : null)
      ),
    };
  }

  private getUsersFromEvent(event: Event) {
    const { team, hosts, owner } = event;
    if (team) {
      return (hosts || []).filter((host) => host.user.username).map(this.mapHostsToUsers);
    }
    if (!owner) {
      return null;
    }
    const { username, name, weekStart, organizationId } = owner;
    return [
      {
        username,
        name,
        weekStart,
        organizationId,
        bookerUrl: getBookerBaseUrlSync(owner.organization?.slug ?? null),
      },
    ];
  }

  private async getOwnerFromUsersArray(eventTypeId: number) {
    const { users } = await this.prismaClient.eventType.findUniqueOrThrow({
      where: { id: eventTypeId },
      select: {
        users: {
          select: {
            username: true,
            name: true,
            weekStart: true,
            organizationId: true,
            organization: {
              select: {
                slug: true,
              },
            },
          },
        },
      },
    });
    if (!users.length) return null;
    return [{ ...users[0], bookerUrl: getBookerBaseUrlSync(users[0].organization?.slug ?? null) }];
  }

  private mapHostsToUsers(host: {
    user: Pick<User, "username" | "name" | "weekStart" | "organizationId"> & {
      organization: { slug: string | null } | null;
    };
  }) {
    return {
      username: host.user.username,
      name: host.user.name,
      weekStart: host.user.weekStart,
      organizationId: host.user.organizationId,
      bookerUrl: getBookerBaseUrlSync(host.user.organization?.slug ?? null),
    };
  }

  ////////////////////////////////////////////
  // DYNAMIC EVENTS
  ////////////////////////////////////////////

  private async getDynamicEvent(usernames: string[], eventSlug: string, org: string | null) {
    const users = await this.prismaClient.user.findMany({
      where: this.buildDynamicEventClause(usernames, org),
      select: dynamicEventSelector,
    });

    const firstUser = users[0];

    const defaultEvent = getDefaultEvent(eventSlug);
    let locations = defaultEvent.locations ? (defaultEvent.locations as LocationObject[]) : [];

    const metadata = userMetadata.parse(firstUser.metadata || {});
    const preferredLocationType = metadata?.defaultConferencingApp;

    if (preferredLocationType?.appSlug) {
      const foundApp = getAppFromSlug(preferredLocationType.appSlug);
      const appType = foundApp?.appData?.location?.type;
      if (appType) {
        // Replace the location with the prefered location type
        // This will still be default to daily if the app is not found
        locations = [{ type: appType, link: preferredLocationType.appLink }] as LocationObject[];
      }
    }

    const defaultEventBookerLayouts = {
      enabledLayouts: [...bookerLayoutOptions],
      defaultLayout: BookerLayouts.MONTH_VIEW,
    } as BookerLayoutSettings;
    const disableBookingTitle = !defaultEvent.isDynamic;
    const unPublishedOrgUser = users.find((user) => user.organization?.slug === null);

    return {
      ...defaultEvent,
      bookingFields: getBookingFieldsWithSystemFields({ ...defaultEvent, disableBookingTitle }),
      // Clears meta data since we don't want to send this in the public api.
      users: users.map((user) => ({
        ...user,
        metadata: undefined,
        bookerUrl: getBookerBaseUrlSync(user.organization?.slug ?? null),
      })),
      locations: privacyFilteredLocations(locations),
      profile: {
        username: firstUser.username,
        name: firstUser.name,
        weekStart: firstUser.weekStart,
        image: `/${firstUser.username}/avatar.png`,
        brandColor: firstUser.brandColor,
        darkBrandColor: firstUser.darkBrandColor,
        theme: null,
        bookerLayouts: bookerLayouts.parse(metadata?.defaultBookerLayouts || defaultEventBookerLayouts),
      },
      entity: {
        isUnpublished: unPublishedOrgUser !== undefined,
        orgSlug: org,
        name: unPublishedOrgUser?.organization?.name ?? null,
      },
      isInstantEvent: false,
    };
  }

  private buildDynamicEventClause(usernames: string[], organizationSlug: string | null) {
    return {
      username: {
        in: usernames,
      },
      organization: organizationSlug ? getSlugOrRequestedSlug(organizationSlug) : null,
    };
  }
}
