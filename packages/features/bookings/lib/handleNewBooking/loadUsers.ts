import { getOrgDomainConfig } from "@calcom/features/ee/organizations/lib/orgDomains";
import {
  getRoutedUsersWithContactOwnerAndFixedUsers,
  findMatchingHostsWithEventSegment,
  getNormalizedHosts,
} from "@calcom/features/users/lib/getRoutedUsers";
import { HttpError } from "@calcom/lib/http-error";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { withSelectedCalendars, UserRepository } from "@calcom/features/users/repositories/UserRepository";
import prisma, { userSelect } from "@calcom/prisma";
import { Prisma } from "@calcom/prisma/client";
import { credentialForCalendarServiceSelect } from "@calcom/prisma/selects/credential";

import type { NewBookingEventType } from "./getEventTypesFromDB";

const log = logger.getSubLogger({ prefix: ["[loadUsers]:handleNewBooking "] });

type EventType = Pick<
  NewBookingEventType,
  | "hosts"
  | "users"
  | "id"
  | "schedulingType"
  | "team"
  | "assignAllTeamMembers"
  | "assignRRMembersUsingSegment"
  | "rrSegmentQueryValue"
>;

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
}) => {
  try {
    const { currentOrgDomain } = getOrgDomainConfig({
      hostname,
      forcedSlug,
      isPlatform,
    });

    const users = eventType.id
      ? await loadUsersByEventType(eventType)
      : await loadDynamicUsers(dynamicUserList, currentOrgDomain);

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
    if (error instanceof HttpError || error instanceof Prisma.PrismaClientKnownRequestError) {
      throw new HttpError({ statusCode: 400, message: error.message });
    }
    throw new HttpError({ statusCode: 500, message: "Unable to load users" });
  }
};

const loadUsersByEventType = async (eventType: EventType): Promise<NewBookingEventType["users"]> => {
  const { hosts, fallbackHosts } = getNormalizedHosts({
    eventType: { ...eventType, hosts: eventType.hosts.filter(Boolean) },
  });
  const matchingHosts = await findMatchingHostsWithEventSegment({
    eventType,
    hosts: hosts ?? fallbackHosts,
  });
  return matchingHosts.map(({ user, isFixed, priority, weight, createdAt, groupId }) => ({
    ...user,
    isFixed,
    priority,
    weight,
    createdAt,
    groupId,
  }));
};

const loadDynamicUsers = async (dynamicUserList: string[], currentOrgDomain: string | null) => {
  if (!Array.isArray(dynamicUserList) || dynamicUserList.length === 0) {
    throw new Error("dynamicUserList is not properly defined or empty.");
  }
  return findUsersByUsername({
    usernameList: dynamicUserList,
    orgSlug: !!currentOrgDomain ? currentOrgDomain : null,
  });
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
}) => {
  log.debug("findUsersByUsername", { usernameList, orgSlug });
  const { where, profiles } = await new UserRepository(prisma)._getWhereClauseForFindingUsersByUsername({
    orgSlug,
    usernameList,
  });
  return (
    await prisma.user.findMany({
      where,
      select: {
        ...userSelect,
        credentials: {
          select: credentialForCalendarServiceSelect,
        },
        metadata: true,
      },
    })
  ).map((_user) => {
    const user = withSelectedCalendars(_user);
    const profile = profiles?.find((profile) => profile.user.id === user.id) ?? null;
    return {
      ...user,
      organizationId: profile?.organizationId ?? null,
      profile,
    };
  });
};

export type LoadedUsers = Awaited<ReturnType<typeof loadUsers>>;

export type OrganizerUser = LoadedUsers[number] & {
  isFixed?: boolean;
  metadata?: Prisma.JsonValue;
};
