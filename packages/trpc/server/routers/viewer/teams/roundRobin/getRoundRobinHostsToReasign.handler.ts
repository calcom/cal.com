import { enrichUsersWithDelegationCredentials } from "@calcom/app-store/delegationCredential";
import dayjs from "@calcom/dayjs";
import { ensureAvailableUsers } from "@calcom/features/bookings/lib/handleNewBooking/ensureAvailableUsers";
import type { IsFixedAwareUser } from "@calcom/features/bookings/lib/handleNewBooking/types";
import { withSelectedCalendars } from "@calcom/features/users/repositories/UserRepository";
import { ErrorCode } from "@calcom/lib/errorCodes";
import logger from "@calcom/lib/logger";
import type { PrismaClient } from "@calcom/prisma";
import { userSelect } from "@calcom/prisma";
import { credentialForCalendarServiceSelect } from "@calcom/prisma/selects/credential";
import { MembershipRole } from "@calcom/prisma/enums";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import type { TGetRoundRobinHostsToReassignInputSchema } from "./getRoundRobinHostsToReasign.schema";

type GetRoundRobinHostsToReassignOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    prisma: PrismaClient;
  };
  input: TGetRoundRobinHostsToReassignInputSchema;
};

type TeamHostsResult = {
  hosts: Awaited<ReturnType<typeof enrichUsersWithDelegationCredentials>>;
  totalCount: number;
  hasNextPage: boolean;
  nextCursor: number | null;
};

type ReassignableHost = {
  id: number;
  name: string | null;
  email: string;
  status: "available" | "unavailable";
};

type GetRoundRobinHostsResult = {
  items: ReassignableHost[];
  nextCursor: number | null;
  totalCount: number;
};

async function getTeamHostsFromDB({
  eventTypeId,
  organizationId,
  prisma,
  searchTerm,
  cursor,
  limit = 20,
  excludeUserId,
}: {
  eventTypeId: number;
  organizationId: number | null;
  prisma: PrismaClient;
  searchTerm?: string;
  cursor?: number;
  limit?: number;
  excludeUserId?: number;
}): Promise<TeamHostsResult> {
  const queryWhere = buildHostQueryWhere(eventTypeId, excludeUserId, searchTerm);
  const [totalCount, _hosts] = await Promise.all([
    prisma.host.count({ where: queryWhere }),
    prisma.host.findMany({
      where: queryWhere,
      select: {
        isFixed: true,
        priority: true,
        user: {
          select: {
            ...userSelect,
            credentials: { select: credentialForCalendarServiceSelect },
          },
        },
      },
      take: limit + 1,
      ...(cursor && {
        skip: 1,
        cursor: { userId_eventTypeId: { userId: cursor, eventTypeId } },
      }),
      orderBy: [{ user: { name: "asc" } }, { priority: "desc" }],
    }),
  ]);
  return processHostsQueryResult(_hosts, limit, organizationId, totalCount);
}

function buildHostQueryWhere(
  eventTypeId: number,
  excludeUserId: number | undefined,
  searchTerm: string | undefined
): Record<string, unknown> {
  return {
    eventTypeId,
    isFixed: false,
    ...(excludeUserId && { userId: { not: excludeUserId } }),
    ...(searchTerm && {
      user: {
        OR: [
          { name: { contains: searchTerm, mode: "insensitive" as const } },
          { email: { contains: searchTerm, mode: "insensitive" as const } },
        ],
      },
    }),
  };
}

async function processHostsQueryResult(
  _hosts: Array<{
    isFixed: boolean;
    priority: number | null;
    user: Record<string, unknown>;
  }>,
  limit: number,
  organizationId: number | null,
  totalCount: number
): Promise<TeamHostsResult> {
  const hosts = _hosts.map((host) => ({
    ...host,
    user: withSelectedCalendars(host.user),
  }));
  const hasNextPage = hosts.length > limit;
  let hostsSubset: typeof hosts;
  if (hasNextPage) {
    hostsSubset = hosts.slice(0, -1);
  } else {
    hostsSubset = hosts;
  }
  const hostsMergedWithUser = hostsSubset.map((host) => ({
    ...host.user,
    isFixed: host.isFixed,
    priority: host.priority ?? 2,
  }));
  let nextCursor: number | null;
  if (hasNextPage) {
    nextCursor = (hostsSubset[hostsSubset.length - 1].user as { id: number }).id;
  } else {
    nextCursor = null;
  }
  const enrichedHosts = await enrichUsersWithDelegationCredentials({
    orgId: organizationId,
    users: hostsMergedWithUser,
  });
  return { hosts: enrichedHosts, totalCount, hasNextPage, nextCursor };
}

async function getEventTypeFromDB(
  eventTypeId: number,
  prisma: PrismaClient
): Promise<Awaited<ReturnType<typeof prisma.eventType.findUniqueOrThrow>>> {
  return prisma.eventType.findUniqueOrThrow({
    where: { id: eventTypeId },
  });
}

async function getAvailableUsers(
  filteredHosts: IsFixedAwareUser[],
  booking: { eventTypeId: number; startTime: Date; endTime: Date },
  prisma: PrismaClient,
  gettingRoundRobinHostsToReassignLogger: ReturnType<typeof logger.getSubLogger>
): Promise<IsFixedAwareUser[]> {
  try {
    const eventType = await getEventTypeFromDB(booking.eventTypeId, prisma);
    return await ensureAvailableUsers(
      // @ts-expect-error - TODO: We need to make sure nothing in the app needs the return type of getEventTypeFromDB as it fetches everything under the sun
      {
        users: filteredHosts,
        ...eventType,
      },
      {
        dateFrom: dayjs(booking.startTime).format(),
        dateTo: dayjs(booking.endTime).format(),
        timeZone: "UTC",
      },
      gettingRoundRobinHostsToReassignLogger
    );
  } catch (error) {
    if (error instanceof Error && error.message === ErrorCode.NoAvailableUsersFound) {
      return [];
    }
    gettingRoundRobinHostsToReassignLogger.error(error);
    return [];
  }
}

function buildResponseItems(
  filteredHosts: Array<{ id: number; name: string | null; email: string }>,
  availableUserIds: Set<number>
): ReassignableHost[] {
  return filteredHosts.map((host) => {
    let status: "available" | "unavailable";
    if (availableUserIds.has(host.id)) {
      status = "available";
    } else {
      status = "unavailable";
    }
    return {
      id: host.id,
      name: host.name,
      email: host.email,
      status,
    };
  });
}

async function checkIsTeamAdminOrOwner(
  prisma: PrismaClient,
  userId: number,
  teamId: number | null | undefined
): Promise<boolean> {
  if (!teamId) {
    return false;
  }
  const membership = await prisma.membership.findUnique({
    where: {
      userId_teamId: {
        userId,
        teamId,
      },
    },
    select: { role: true },
  });
  if (membership?.role === MembershipRole.ADMIN) {
    return true;
  }
  if (membership?.role === MembershipRole.OWNER) {
    return true;
  }
  return false;
}

async function getUserHostGroupIds(
  prisma: PrismaClient,
  userId: number,
  eventTypeId: number
): Promise<string[]> {
  const userHost = await prisma.host.findUnique({
    where: {
      userId_eventTypeId: {
        userId,
        eventTypeId,
      },
    },
    select: { groupId: true },
  });
  if (userHost?.groupId) {
    return [userHost.groupId];
  }
  return [];
}

async function filterHostsByGroup<T extends { id: number }>(
  prisma: PrismaClient,
  hosts: T[],
  eventTypeId: number,
  isTeamAdminOrOwner: boolean,
  userHostGroupIds: string[]
): Promise<T[]> {
  if (isTeamAdminOrOwner) {
    return hosts;
  }
  // Non-admin users must be hosts of this event type to access reassignment
  if (userHostGroupIds.length === 0) {
    return [];
  }
  const hostsWithGroups = await prisma.host.findMany({
    where: {
      eventTypeId,
      isFixed: false,
      userId: { in: hosts.map((h) => h.id) },
      groupId: { in: userHostGroupIds },
    },
    select: { userId: true },
  });
  const allowedUserIds = new Set(hostsWithGroups.map((h) => h.userId));
  return hosts.filter((h) => allowedUserIds.has(h.id));
}

function adjustPaginationForFiltering(
  isTeamAdminOrOwner: boolean,
  userHostGroupIds: string[],
  totalCount: number,
  nextCursor: number | null,
  itemsLength: number
): { adjustedTotalCount: number; adjustedNextCursor: number | null } {
  if (isTeamAdminOrOwner) {
    return { adjustedTotalCount: totalCount, adjustedNextCursor: nextCursor };
  }
  // Non-admin users without host group membership get empty results
  if (userHostGroupIds.length === 0) {
    return { adjustedTotalCount: 0, adjustedNextCursor: null };
  }
  return { adjustedTotalCount: itemsLength, adjustedNextCursor: null };
}

type BookingWithEventType = {
  userId: number | null;
  startTime: Date;
  endTime: Date;
  eventTypeId: number;
  eventType: { teamId: number | null; _count: { hostGroups: number } } | null;
};

async function fetchBookingWithEventType(
  prisma: PrismaClient,
  bookingId: number
): Promise<BookingWithEventType> {
  const booking = await prisma.booking.findUniqueOrThrow({
    where: { id: bookingId },
    select: {
      userId: true,
      startTime: true,
      endTime: true,
      eventTypeId: true,
      eventType: {
        select: { teamId: true, _count: { select: { hostGroups: true } } },
      },
    },
  });
  if (!booking.eventTypeId) {
    throw new Error("Booking requires a event type to reassign hosts");
  }
  return booking as BookingWithEventType;
}

type FilteredHostsResult = {
  filteredHosts: Awaited<ReturnType<typeof enrichUsersWithDelegationCredentials>>;
  isTeamAdminOrOwner: boolean;
  userHostGroupIds: string[];
};

async function getFilteredHostsForReassign(
  prisma: PrismaClient,
  userId: number,
  booking: BookingWithEventType,
  hosts: Awaited<ReturnType<typeof enrichUsersWithDelegationCredentials>>
): Promise<FilteredHostsResult> {
  const isTeamAdminOrOwner = await checkIsTeamAdminOrOwner(prisma, userId, booking.eventType?.teamId);
  let userHostGroupIds: string[] = [];
  if (!isTeamAdminOrOwner) {
    userHostGroupIds = await getUserHostGroupIds(prisma, userId, booking.eventTypeId);
  }
  const filteredHosts = await filterHostsByGroup(
    prisma,
    hosts,
    booking.eventTypeId,
    isTeamAdminOrOwner,
    userHostGroupIds
  );
  return { filteredHosts, isTeamAdminOrOwner, userHostGroupIds };
}

function getExcludeUserIdForReassign(booking: BookingWithEventType): number | undefined {
  const hostGroupCount = booking.eventType?._count?.hostGroups ?? 0;
  if (hostGroupCount > 1) {
    return undefined;
  }
  return booking.userId ?? undefined;
}

export const getRoundRobinHostsToReassign = async ({
  ctx,
  input,
}: GetRoundRobinHostsToReassignOptions): Promise<GetRoundRobinHostsResult> => {
  const { prisma, user } = ctx;
  const { bookingId, limit, cursor, searchTerm } = input;
  const gettingRoundRobinHostsToReassignLogger = logger.getSubLogger({
    prefix: ["gettingRoundRobinHostsToReassign", `${bookingId}`],
  });

  const booking = await fetchBookingWithEventType(prisma, bookingId);

  // For multi-group round-robin events, show ALL hosts including currently assigned ones.
  // For single-group events, maintain existing behavior (hide assigned host).
  const excludeUserId = getExcludeUserIdForReassign(booking);

  const { hosts, totalCount, nextCursor } = await getTeamHostsFromDB({
    eventTypeId: booking.eventTypeId,
    organizationId: user.organizationId,
    prisma,
    searchTerm,
    cursor,
    limit,
    excludeUserId,
  });

  const { filteredHosts, isTeamAdminOrOwner, userHostGroupIds } = await getFilteredHostsForReassign(
    prisma,
    user.id,
    booking,
    hosts
  );

  const availableUsers = await getAvailableUsers(
    filteredHosts as IsFixedAwareUser[],
    booking,
    prisma,
    gettingRoundRobinHostsToReassignLogger
  );

  const availableUserIds = new Set(availableUsers.map((u) => u.id));
  const items = buildResponseItems(filteredHosts, availableUserIds);
  const { adjustedTotalCount, adjustedNextCursor } = adjustPaginationForFiltering(
    isTeamAdminOrOwner,
    userHostGroupIds,
    totalCount,
    nextCursor,
    items.length
  );

  return {
    items,
    nextCursor: adjustedNextCursor,
    totalCount: adjustedTotalCount,
  };
};

export default getRoundRobinHostsToReassign;
