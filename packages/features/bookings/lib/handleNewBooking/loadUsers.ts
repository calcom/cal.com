import { getOrgDomainConfig } from "@calcom/features/ee/organizations/lib/orgDomains";
import {
  findMatchingHostsWithEventSegment,
  getRoutedUsersWithContactOwnerAndFixedUsers,
} from "@calcom/features/users/lib/getRoutedUsers";
import type { NormalizedHost } from "@calcom/features/users/lib/getRoutedUsers";
import { UserRepository, withSelectedCalendars } from "@calcom/features/users/repositories/UserRepository";
import type { DefaultEvent } from "@calcom/features/eventtypes/lib/defaultEvents";
import { buildNonDelegationCredentials } from "@calcom/lib/delegationCredential";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { getServerErrorFromUnknown } from "@calcom/lib/server/getServerErrorFromUnknown";
import prisma, { userSelect } from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";
import { SchedulingType } from "@calcom/prisma/enums";
import { credentialForCalendarServiceSelect } from "@calcom/prisma/selects/credential";
import type { CredentialForCalendarService, CredentialPayload } from "@calcom/types/Credential";

import type { getEventTypeResponse } from "./getEventTypesFromDB";
import type { IsFixedAwareUser } from "./types";

const log = logger.getSubLogger({ prefix: ["[loadUsers]:handleNewBooking "] });

type DynamicEventType = Pick<
  DefaultEvent,
  | "hosts"
  | "users"
  | "id"
  | "schedulingType"
  | "team"
  | "assignAllTeamMembers"
  | "assignRRMembersUsingSegment"
  | "rrSegmentQueryValue"
>;

type PersistedEventType = Pick<
  getEventTypeResponse,
  | "hosts"
  | "users"
  | "id"
  | "schedulingType"
  | "team"
  | "assignAllTeamMembers"
  | "assignRRMembersUsingSegment"
  | "rrSegmentQueryValue"
>;
type EventType = DynamicEventType | PersistedEventType;

export const withCalendarServiceCredentials = <TUser extends { credentials: CredentialPayload[] }>(
  user: TUser
): Omit<TUser, "credentials"> & { credentials: CredentialForCalendarService[] } => {
  const { credentials, ...restUser } = user;
  return {
    ...restUser,
    credentials: buildNonDelegationCredentials(credentials),
  };
};

export const loadUsers = async ({
  eventType,
  dynamicUserList,
  hostname,
  forcedSlug,
  isPlatform,
  routedTeamMemberIds,
  contactOwnerEmail,
}: {
  eventType: EventType;
  dynamicUserList: string[];
  routedTeamMemberIds: number[] | null;
  contactOwnerEmail: string | null;
  hostname: string;
  forcedSlug: string | undefined;
  isPlatform: boolean;
}): Promise<IsFixedAwareUser[]> => {
  try {
    const { currentOrgDomain } = getOrgDomainConfig({
      hostname,
      forcedSlug,
      isPlatform,
    });
    const schedulingType = eventType.schedulingType;

    const users: IsFixedAwareUser[] =
      eventType.id > 0
        ? await loadUsersByEventType(eventType as PersistedEventType)
        : await loadDynamicUsers({
            dynamicUserList,
            currentOrgDomain,
            schedulingType,
          });

    const routedUsers = getRoutedUsersWithContactOwnerAndFixedUsers({
      users,
      routedTeamMemberIds,
      contactOwnerEmail,
    });

    if (routedUsers.length) {
      return routedUsers;
    }

    return users;
  } catch (error) {
    log.error("Unable to load users", safeStringify(error));
    const httpError = getServerErrorFromUnknown(error);
    throw httpError;
  }
};

const loadUsersByEventType = async (eventType: PersistedEventType): Promise<IsFixedAwareUser[]> => {
  type PersistedUser = PersistedEventType["users"][number];
  const normalizedHosts: NormalizedHost<PersistedUser>[] =
    eventType.hosts.length && eventType.schedulingType
      ? eventType.hosts.filter(Boolean).map((host) => ({
          isFixed: host.isFixed,
          user: host.user,
          priority: host.priority,
          weight: host.weight,
          overrideMinimumBookingNotice: host.overrideMinimumBookingNotice,
          overrideBeforeEventBuffer: host.overrideBeforeEventBuffer,
          overrideAfterEventBuffer: host.overrideAfterEventBuffer,
          overrideSlotInterval: host.overrideSlotInterval,
          overrideBookingLimits: host.overrideBookingLimits,
          overrideDurationLimits: host.overrideDurationLimits,
          overridePeriodType: host.overridePeriodType,
          overridePeriodStartDate: host.overridePeriodStartDate,
          overridePeriodEndDate: host.overridePeriodEndDate,
          overridePeriodDays: host.overridePeriodDays,
          overridePeriodCountCalendarDays: host.overridePeriodCountCalendarDays,
          createdAt: host.createdAt,
          groupId: host.groupId,
        }))
      : eventType.users.map((user) => ({
          isFixed: eventType.schedulingType === SchedulingType.COLLECTIVE,
          user,
          createdAt: null,
          groupId: null,
        }));

  const matchingHosts = await findMatchingHostsWithEventSegment({
    eventType,
    hosts: normalizedHosts,
  });
  return matchingHosts.map(
    ({
      user,
      isFixed,
      priority,
      weight,
      overrideMinimumBookingNotice,
      overrideBeforeEventBuffer,
      overrideAfterEventBuffer,
      overrideSlotInterval,
      overrideBookingLimits,
      overrideDurationLimits,
      overridePeriodType,
      overridePeriodStartDate,
      overridePeriodEndDate,
      overridePeriodDays,
      overridePeriodCountCalendarDays,
      createdAt,
      groupId,
    }) => ({
      ...withCalendarServiceCredentials(user),
      isFixed,
      priority: priority ?? undefined,
      weight: weight ?? undefined,
      overrideMinimumBookingNotice,
      overrideBeforeEventBuffer,
      overrideAfterEventBuffer,
      overrideSlotInterval,
      overrideBookingLimits,
      overrideDurationLimits,
      overridePeriodType,
      overridePeriodStartDate,
      overridePeriodEndDate,
      overridePeriodDays,
      overridePeriodCountCalendarDays,
      createdAt,
      groupId,
    })
  );
};

const loadDynamicUsers = async ({
  dynamicUserList,
  currentOrgDomain,
  schedulingType,
}: {
  dynamicUserList: string[];
  currentOrgDomain: string | null;
  schedulingType: EventType["schedulingType"];
}): Promise<IsFixedAwareUser[]> => {
  if (!Array.isArray(dynamicUserList) || dynamicUserList.length === 0) {
    throw new Error("dynamicUserList is not properly defined or empty.");
  }

  const users = await findUsersByUsername({
    usernameList: dynamicUserList,
    orgSlug: currentOrgDomain ? currentOrgDomain : null,
  });

  // For dynamic group bookings: reorder users to match dynamicUserList order
  // to ensure the first user in the URL is the organizer/host
  return users
    .sort((a, b) => {
      const aIndex = dynamicUserList.indexOf(a.username!);
      const bIndex = dynamicUserList.indexOf(b.username!);
      return aIndex - bIndex;
    })
    .map((user) => ({
      ...withCalendarServiceCredentials(user),
      isFixed: schedulingType !== SchedulingType.ROUND_ROBIN,
    }));
};

/**
 * This method is mostly same as the one in UserRepository but it includes a lot more relations which are specific requirement here
 * TODO: Figure out how to keep it in UserRepository and use it here
 */
export const findUsersByUsername = async ({
  usernameList,
  orgSlug,
}: {
  orgSlug: string | null;
  usernameList: string[];
}): Promise<Omit<IsFixedAwareUser, "isFixed">[]> => {
  log.debug("findUsersByUsername", { usernameList, orgSlug });
  const { where } = await new UserRepository(prisma)._getWhereClauseForFindingUsersByUsername({
    orgSlug,
    usernameList,
  });
  return (await prisma.user.findMany({
    where,
    select: {
      ...userSelect,
      credentials: {
        select: credentialForCalendarServiceSelect,
      },
      metadata: true,
    },
  })).map((_user) => withCalendarServiceCredentials(withSelectedCalendars(_user)));
};

export type LoadedUsers = Awaited<ReturnType<typeof loadUsers>>;

export type OrganizerUser = LoadedUsers[number] & {
  isFixed?: boolean;
  metadata?: Prisma.JsonValue;
};
