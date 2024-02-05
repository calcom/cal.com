import type { User as UserType } from "@prisma/client";

import { privacyFilteredLocations, type LocationObject } from "@calcom/app-store/locations";
import { getAppFromSlug } from "@calcom/app-store/utils";
import { getBookingFieldsWithSystemFields } from "@calcom/features/bookings/lib/getBookingFields";
import { getSlugOrRequestedSlug } from "@calcom/features/ee/organizations/lib/orgDomains";
import { publicEventSelector } from "@calcom/features/eventtypes/lib/event-service/validators";
import { isRecurringEvent, parseRecurringEvent } from "@calcom/lib";
import { getDefaultEvent, getUsernameList } from "@calcom/lib/defaultEvents";
import { getBookerBaseUrlSync } from "@calcom/lib/getBookerUrl/client";
import { markdownToSafeHTML } from "@calcom/lib/markdownToSafeHTML";
import { UserRepository } from "@calcom/lib/server/repository/user";
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
  bookerLayouts as bookerLayoutsSchema,
} from "@calcom/prisma/zod-utils";
import type { UserProfile } from "@calcom/types/UserProfile";

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
              ...(orgQuery
                ? {
                    profiles: {
                      some: {
                        organization: orgQuery,
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
      this.getUsersFromEvent(eventWithUserProfiles) || (await this.getOwnerFromUsersArray(event.id));

    if (users === null) {
      throw new Error("Event has no owner");
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
      profile: this.getProfileFromEvent(eventWithUserProfiles),
      users,
      entity: {
        isUnpublished:
          eventWithUserProfiles.team?.slug === null ||
          eventWithUserProfiles.owner?.profile?.organization?.slug === null ||
          eventWithUserProfiles.team?.parent?.slug === null,
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
      assignAllTeamMembers: event.assignAllTeamMembers,
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

  private getUsersFromEvent(
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
    }
  ) {
    const { team, hosts, owner } = event;
    if (team) {
      return (hosts || []).filter((host) => host.user.username).map(this.mapHostsToUsers);
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

  private async getOwnerFromUsersArray(eventTypeId: number) {
    const { users } = await this.prismaClient.eventType.findUniqueOrThrow({
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

  private mapHostsToUsers(host: {
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

  ////////////////////////////////////////////
  // DYNAMIC EVENTS
  ////////////////////////////////////////////

  private async getDynamicEvent(usernames: string[], eventSlug: string, org: string | null) {
    const usersInOrgContext = await UserRepository.findUsersByUsername({
      usernameList: usernames,
      orgSlug: org,
    });
    const users = usersInOrgContext;

    const firstUser = usersInOrgContext[0];

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
        name: unPublishedOrgUser?.profile?.organization?.name ?? null,
      },
      isInstantEvent: false,
    };
  }
}
