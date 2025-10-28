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
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import type { TGetRoundRobinHostsToReassignInputSchema } from "./getRoundRobinHostsToReasign.schema";

type GetRoundRobinHostsToReassignOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    prisma: PrismaClient;
  };
  input: TGetRoundRobinHostsToReassignInputSchema;
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
}) {
  const queryWhere = {
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
            credentials: {
              select: credentialForCalendarServiceSelect,
            },
          },
        },
      },
      take: limit + 1, // Take one more to determine if there's a next page
      ...(cursor && { skip: 1, cursor: { userId_eventTypeId: { userId: cursor, eventTypeId } } }),
      orderBy: [{ user: { name: "asc" } }, { priority: "desc" }],
    }),
  ]);

  const hosts = _hosts.map((host) => ({
    ...host,
    user: withSelectedCalendars(host.user),
  }));

  const hasNextPage = hosts.length > limit;
  const hosts_subset = hasNextPage ? hosts.slice(0, -1) : hosts;
  const hostsMergedWithUser = hosts_subset.map((host) => ({
    ...host.user,
    isFixed: host.isFixed,
    priority: host.priority ?? 2,
  }));

  return {
    hosts: await enrichUsersWithDelegationCredentials({
      orgId: organizationId,
      users: hostsMergedWithUser,
    }),
    totalCount,
    hasNextPage,
    nextCursor: hasNextPage ? hosts_subset[hosts_subset.length - 1].user.id : null,
  };
}

async function getEventTypeFromDB(eventTypeId: number, prisma: PrismaClient) {
  return prisma.eventType.findUniqueOrThrow({
    where: { id: eventTypeId },
  });
}

export const getRoundRobinHostsToReassign = async ({ ctx, input }: GetRoundRobinHostsToReassignOptions) => {
  const { prisma, user } = ctx;
  const { bookingId, limit, cursor, searchTerm } = input;
  const organizationId = user.organizationId;
  const gettingRoundRobinHostsToReassignLogger = logger.getSubLogger({
    prefix: ["gettingRoundRobinHostsToReassign", `${bookingId}`],
  });

  const booking = await prisma.booking.findUniqueOrThrow({
    where: { id: bookingId },
    select: {
      userId: true,
      startTime: true,
      endTime: true,
      eventTypeId: true,
    },
  });

  if (!booking.eventTypeId) {
    throw new Error("Booking requires a event type to reassign hosts");
  }

  const { hosts, totalCount, nextCursor } = await getTeamHostsFromDB({
    eventTypeId: booking.eventTypeId,
    organizationId,
    prisma,
    searchTerm,
    cursor,
    limit,
    excludeUserId: booking.userId ?? undefined,
  });

  let availableUsers: IsFixedAwareUser[] = [];
  try {
    const eventType = await getEventTypeFromDB(booking.eventTypeId, prisma);
    availableUsers = await ensureAvailableUsers(
      // @ts-expect-error - TODO: We need to make sure nothing in the app needs the return type of getEventTypeFromDB as it fetches everything under the sun
      {
        users: hosts as IsFixedAwareUser[],
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
      availableUsers = [];
    } else {
      gettingRoundRobinHostsToReassignLogger.error(error);
    }
  }

  const availableUserIds = new Set(availableUsers.map((u) => u.id));

  const items = hosts.map((host) => ({
    id: host.id,
    name: host.name,
    email: host.email,
    status: availableUserIds.has(host.id) ? "available" : "unavailable",
  }));

  return {
    items,
    nextCursor,
    totalCount,
  };
};

export default getRoundRobinHostsToReassign;
