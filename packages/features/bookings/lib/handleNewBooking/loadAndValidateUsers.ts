import type { Logger } from "tslog";

import { enrichUsersWithDelegationCredentials } from "@calcom/app-store/delegationCredential";
import type { RoutingFormResponse } from "@calcom/features/bookings/lib/getLuckyUser";
import { getQualifiedHostsService } from "@calcom/features/di/containers/QualifiedHosts";
import { withSelectedCalendars } from "@calcom/features/users/repositories/UserRepository";
import { sentrySpan } from "@calcom/features/watchlist/lib/telemetry";
import { checkIfUsersAreBlocked } from "@calcom/features/watchlist/operations/check-if-users-are-blocked.controller";
import getOrgIdFromMemberOrTeamId from "@calcom/lib/getOrgIdFromMemberOrTeamId";
import { HttpError } from "@calcom/lib/http-error";
import { getPiiFreeUser } from "@calcom/lib/piiFreeData";
import { safeStringify } from "@calcom/lib/safeStringify";
import { withReporting } from "@calcom/lib/sentryWrapper";
import { userSelect } from "@calcom/prisma";
import prisma from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";
import { SchedulingType } from "@calcom/prisma/enums";
import { credentialForCalendarServiceSelect } from "@calcom/prisma/selects/credential";
import type { CredentialForCalendarService } from "@calcom/types/Credential";

import type { NewBookingEventType } from "./getEventTypesFromDB";
import { loadUsers } from "./loadUsers";

type Users = (Awaited<ReturnType<typeof loadUsers>>[number] & {
  isFixed?: boolean;
  metadata?: Prisma.JsonValue;
  createdAt?: Date;
})[];

export type UsersWithDelegationCredentials = (Omit<
  Awaited<ReturnType<typeof loadUsers>>[number],
  "credentials"
> & {
  isFixed?: boolean;
  metadata?: Prisma.JsonValue;
  createdAt?: Date;
  credentials: CredentialForCalendarService[];
})[];

type EventType = Pick<
  NewBookingEventType,
  | "hosts"
  | "users"
  | "id"
  | "userId"
  | "schedulingType"
  | "maxLeadThreshold"
  | "team"
  | "assignAllTeamMembers"
  | "assignRRMembersUsingSegment"
  | "rrSegmentQueryValue"
  | "isRRWeightsEnabled"
  | "rescheduleWithSameRoundRobinHost"
  | "teamId"
  | "includeNoShowInRRCalculation"
  | "rrHostSubsetEnabled"
>;

type InputProps = {
  eventType: EventType;
  eventTypeId: number;
  dynamicUserList: string[];
  logger: Logger<unknown>;
  routedTeamMemberIds: number[] | null;
  contactOwnerEmail: string | null;
  rescheduleUid: string | null;
  routingFormResponse: RoutingFormResponse | null;
  isPlatform: boolean;
  hostname: string | undefined;
  forcedSlug: string | undefined;
  rrHostSubsetIds?: number[];
};

const _loadAndValidateUsers = async ({
  eventType,
  eventTypeId,
  dynamicUserList,
  logger,
  routedTeamMemberIds,
  contactOwnerEmail,
  rescheduleUid,
  routingFormResponse,
  isPlatform,
  hostname,
  forcedSlug,
  rrHostSubsetIds,
}: InputProps): Promise<{
  qualifiedRRUsers: UsersWithDelegationCredentials;
  additionalFallbackRRUsers: UsersWithDelegationCredentials;
  fixedUsers: UsersWithDelegationCredentials;
}> => {
  let users: Users = await loadUsers({
    eventType,
    dynamicUserList,
    hostname: hostname || "",
    forcedSlug,
    isPlatform,
    routedTeamMemberIds,
    contactOwnerEmail,
  });

  const isDynamicAllowed = !users.some((user) => !user.allowDynamicBooking);
  if (!isDynamicAllowed && !eventTypeId) {
    logger.warn({
      message: "NewBooking: Some of the users in this group do not allow dynamic booking",
    });
    throw new HttpError({
      message: "Some of the users in this group do not allow dynamic booking",
      statusCode: 400,
    });
  }

  // If this event was pre-relationship migration
  // TODO: Establish whether this is dead code.
  if (!users.length && eventType.userId) {
    const eventTypeUser = await prisma.user.findUnique({
      where: {
        id: eventType.userId,
      },
      select: {
        credentials: {
          select: credentialForCalendarServiceSelect,
        }, // Don't leak to client
        ...userSelect,
      },
    });
    if (!eventTypeUser) {
      logger.warn({ message: "NewBooking: eventTypeUser.notFound" });
      throw new HttpError({ statusCode: 404, message: "eventTypeUser.notFound" });
    }
    users.push(withSelectedCalendars(eventTypeUser));
  }

  if (!users) throw new HttpError({ statusCode: 404, message: "eventTypeUser.notFound" });

  // Determine if users are locked
  const containsBlockedUser = await checkIfUsersAreBlocked({
    users,
    organizationId: null,
    span: sentrySpan,
  });

  if (containsBlockedUser) throw new HttpError({ statusCode: 404, message: "eventTypeUser.notFound" });

  // map fixed users
  users = users.map((user) => ({
    ...user,
    isFixed:
      user.isFixed === false
        ? false
        : user.isFixed || eventType.schedulingType !== SchedulingType.ROUND_ROBIN,
  }));
  const qualifiedHostsService = getQualifiedHostsService();
  const { qualifiedRRHosts, allFallbackRRHosts, fixedHosts } =
    await qualifiedHostsService.findQualifiedHostsWithDelegationCredentials({
      eventType,
      routedTeamMemberIds: routedTeamMemberIds || [],
      rescheduleUid,
      contactOwnerEmail,
      routingFormResponse,
      rrHostSubsetIds,
    });
  const allQualifiedHostsHashMap = [...qualifiedRRHosts, ...(allFallbackRRHosts ?? []), ...fixedHosts].reduce(
    (acc, host) => {
      if (host.user.id) {
        return { ...acc, [host.user.id]: host };
      }
      return acc;
    },
    {} as {
      [key: number]: Awaited<
        ReturnType<ReturnType<typeof getQualifiedHostsService>["findQualifiedHostsWithDelegationCredentials"]>
      >["qualifiedRRHosts"][number];
    }
  );

  let qualifiedRRUsers: UsersWithDelegationCredentials = [];
  let allFallbackRRUsers: UsersWithDelegationCredentials = [];
  let fixedUsers: UsersWithDelegationCredentials = [];

  if (qualifiedRRHosts.length) {
    // remove users that are not in the qualified hosts array
    const qualifiedHostIds = new Set(qualifiedRRHosts.map((qualifiedHost) => qualifiedHost.user.id));
    qualifiedRRUsers = users
      .filter((user) => qualifiedHostIds.has(user.id))
      .map((user) => ({ ...user, credentials: allQualifiedHostsHashMap[user.id].user.credentials }));
  }

  if (allFallbackRRHosts?.length) {
    const fallbackHostIds = new Set(allFallbackRRHosts.map((fallbackHost) => fallbackHost.user.id));
    allFallbackRRUsers = users
      .filter((user) => fallbackHostIds.has(user.id))
      .map((user) => ({ ...user, credentials: allQualifiedHostsHashMap[user.id].user.credentials }));
  }

  if (fixedHosts?.length) {
    const fixedHostIds = new Set(fixedHosts.map((fixedHost) => fixedHost.user.id));
    fixedUsers = users
      .filter((user) => fixedHostIds.has(user.id))
      .map((user) => ({ ...user, credentials: allQualifiedHostsHashMap[user.id].user.credentials }));
  }

  logger.debug(
    "Concerned users",
    safeStringify({
      users: users.map(getPiiFreeUser),
    })
  );

  const additionalFallbackRRUsers = allFallbackRRUsers.filter(
    (fallbackUser) => !qualifiedRRUsers.find((qualifiedUser) => qualifiedUser.id === fallbackUser.id)
  );

  if (!qualifiedRRUsers.length && !fixedUsers.length) {
    const firstUser = users[0];
    const firstUserOrgId = await getOrgIdFromMemberOrTeamId({
      memberId: firstUser.id ?? null,
      teamId: eventType.teamId,
    });
    const usersEnrichedWithDelegationCredential = await enrichUsersWithDelegationCredentials({
      orgId: firstUserOrgId ?? null,
      users,
    });
    return {
      qualifiedRRUsers,
      additionalFallbackRRUsers, // without qualified
      fixedUsers: usersEnrichedWithDelegationCredential,
    };
  }

  return {
    qualifiedRRUsers,
    additionalFallbackRRUsers, // without qualified
    fixedUsers,
  };
};

export const loadAndValidateUsers = withReporting(_loadAndValidateUsers, "loadAndValidateUsers");
