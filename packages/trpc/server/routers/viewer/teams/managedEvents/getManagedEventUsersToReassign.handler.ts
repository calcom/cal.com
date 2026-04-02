import { enrichUsersWithDelegationCredentials } from "@calcom/app-store/delegationCredential";
import dayjs from "@calcom/dayjs";
import { ensureAvailableUsers } from "@calcom/features/bookings/lib/handleNewBooking/ensureAvailableUsers";
import { getEventTypesFromDB } from "@calcom/features/bookings/lib/handleNewBooking/getEventTypesFromDB";
import type { IsFixedAwareUser } from "@calcom/features/bookings/lib/handleNewBooking/types";
import { BookingRepository } from "@calcom/features/bookings/repositories/BookingRepository";
import { EventTypeRepository } from "@calcom/features/eventtypes/repositories/eventTypeRepository";
import { withSelectedCalendars } from "@calcom/features/users/repositories/UserRepository";
import { ErrorCode } from "@calcom/lib/errorCodes";
import logger from "@calcom/lib/logger";
import type { PrismaClient } from "@calcom/prisma";
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
  const eventTypeRepository = new EventTypeRepository(prisma);
  const { totalCount, items, hasMore, nextCursor } = await eventTypeRepository.listChildEventTypes({
    parentEventTypeId,
    excludeUserId,
    searchTerm,
    limit,
    cursor,
  });

  const users = items
    .filter((et): et is typeof et & { owner: NonNullable<typeof et.owner> } => et.owner !== null)
    .map((et) => withSelectedCalendars(et.owner));

  return {
    users: await enrichUsersWithDelegationCredentials({
      orgId: organizationId,
      users,
    }),
    totalCount,
    hasNextPage: hasMore,
    nextCursor,
  };
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

  const bookingRepository = new BookingRepository(prisma);
  const eventTypeRepository = new EventTypeRepository(prisma);

  const booking = await bookingRepository.findByIdForTargetEventTypeSearch(bookingId);

  if (!booking) {
    throw new Error(`Booking ${bookingId} not found`);
  }

  if (!booking.eventTypeId) {
    throw new Error("Booking requires an event type to reassign users");
  }

  const childEventType = await eventTypeRepository.findByIdWithParent(booking.eventTypeId);

  if (!childEventType) {
    throw new Error(`Event type ${booking.eventTypeId} not found`);
  }

  if (!childEventType.parentId) {
    throw new Error("Booking is not on a managed event type");
  }

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
    const eventType = await getEventTypesFromDB(booking.eventTypeId);
    if (!eventType) {
      throw new Error("Event type not found");
    }
    availableUsers = await ensureAvailableUsers(
      {
        ...eventType,
        users: users as IsFixedAwareUser[],
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
