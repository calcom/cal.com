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

import type { TGetManagedEventUsersToReassignInputSchema } from "./getManagedEventUsersToReassign.schema";

type GetManagedEventUsersToReassignOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    prisma: PrismaClient;
  };
  input: TGetManagedEventUsersToReassignInputSchema;
};

async function getManagedEventUsersFromDB({
  parentEventTypeId,
  organizationId,
  prisma,
  searchTerm,
  cursor,
  limit = 20,
  excludeUserId,
}: {
  parentEventTypeId: number;
  organizationId: number | null;
  prisma: PrismaClient;
  searchTerm?: string;
  cursor?: number;
  limit?: number;
  excludeUserId?: number;
}) {
  const queryWhere = {
    parentId: parentEventTypeId,
    ...(excludeUserId && { userId: { not: excludeUserId } }),
    ...(searchTerm && {
      owner: {
        OR: [
          { name: { contains: searchTerm, mode: "insensitive" as const } },
          { email: { contains: searchTerm, mode: "insensitive" as const } },
        ],
      },
    }),
  };

  const [totalCount, childEventTypes] = await Promise.all([
    prisma.eventType.count({ where: queryWhere }),
    prisma.eventType.findMany({
      where: queryWhere,
      select: {
        id: true,
        userId: true,
        owner: {
          select: {
            ...userSelect,
            credentials: {
              select: credentialForCalendarServiceSelect,
            },
          },
        },
      },
      take: limit + 1, // Take one more to determine if there's a next page
      ...(cursor && { skip: 1, cursor: { id: cursor } }),
      orderBy: { owner: { name: "asc" } },
    }),
  ]);

  const hasNextPage = childEventTypes.length > limit;
  const childEventTypes_subset = hasNextPage ? childEventTypes.slice(0, -1) : childEventTypes;
  
  const users = childEventTypes_subset
    .filter((et) => et.owner !== null)
    .map((et) => withSelectedCalendars(et.owner!));

  return {
    users: await enrichUsersWithDelegationCredentials({
      orgId: organizationId,
      users,
    }),
    totalCount,
    hasNextPage,
    nextCursor: hasNextPage ? childEventTypes_subset[childEventTypes_subset.length - 1].id : null,
  };
}

async function getEventTypeFromDB(eventTypeId: number, prisma: PrismaClient) {
  return prisma.eventType.findUniqueOrThrow({
    where: { id: eventTypeId },
  });
}

export const getManagedEventUsersToReassign = async ({
  ctx,
  input,
}: GetManagedEventUsersToReassignOptions) => {
  const { prisma, user } = ctx;
  const { bookingId, limit, cursor, searchTerm } = input;
  const organizationId = user.organizationId;
  const gettingManagedEventUsersToReassignLogger = logger.getSubLogger({
    prefix: ["gettingManagedEventUsersToReassign", `${bookingId}`],
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
    throw new Error("Booking requires an event type to reassign users");
  }

  // Get the child event type to find the parent
  const childEventType = await prisma.eventType.findUniqueOrThrow({
    where: { id: booking.eventTypeId },
    select: {
      id: true,
      parentId: true,
    },
  });

  if (!childEventType.parentId) {
    throw new Error("Booking is not on a managed event type");
  }

  // Get all users from sibling child event types
  const { users, totalCount, nextCursor } = await getManagedEventUsersFromDB({
    parentEventTypeId: childEventType.parentId,
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
        users: users as IsFixedAwareUser[],
        ...eventType,
      },
      {
        dateFrom: dayjs(booking.startTime).format(),
        dateTo: dayjs(booking.endTime).format(),
        timeZone: "UTC",
      },
      gettingManagedEventUsersToReassignLogger
    );
  } catch (error) {
    if (error instanceof Error && error.message === ErrorCode.NoAvailableUsersFound) {
      availableUsers = [];
    } else {
      gettingManagedEventUsersToReassignLogger.error(error);
    }
  }

  const availableUserIds = new Set(availableUsers.map((u) => u.id));

  const items = users.map((user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    status: availableUserIds.has(user.id) ? ("available" as const) : ("unavailable" as const),
  }));

  return {
    items,
    nextCursor,
    totalCount,
  };
};

export default getManagedEventUsersToReassign;

