import dayjs from "@calcom/dayjs";
import { ensureAvailableUsers } from "@calcom/features/bookings/lib/handleNewBooking/ensureAvailableUsers";
import { getEventTypesFromDB } from "@calcom/features/bookings/lib/handleNewBooking/getEventTypesFromDB";
import type { IsFixedAwareUser } from "@calcom/features/bookings/lib/handleNewBooking/types";
import { ErrorCode } from "@calcom/lib/errorCodes";
import logger from "@calcom/lib/logger";
import type { PrismaClient } from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import type { TGetRoundRobinHostsToReassignInputSchema } from "./getRoundRobinHostsToReasign.schema";

type GetRoundRobinHostsToReassignOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    prisma: PrismaClient;
  };
  input: TGetRoundRobinHostsToReassignInputSchema;
};

export const getRoundRobinHostsToReassign = async ({ ctx, input }: GetRoundRobinHostsToReassignOptions) => {
  const { prisma } = ctx;

  const gettingRoundRobinHostsToReassignLogger = logger.getSubLogger({
    prefix: ["gettingRoundRobinHostsToReassign", `${input.bookingId}`],
  });

  const booking = await prisma.booking.findUniqueOrThrow({
    where: { id: input.bookingId },
    select: {
      userId: true,
      startTime: true,
      endTime: true,
      eventType: {
        select: {
          id: true,
          timeZone: true,
          teamId: true,
        },
      },
    },
  });

  if (!booking?.eventType) {
    throw new Error("Booking not found");
  }

  // Get event type
  const eventType = await getEventTypesFromDB(booking.eventType.id);

  if (!eventType) {
    throw new Error("Event type not found");
  }

  if (!eventType.teamId) {
    gettingRoundRobinHostsToReassignLogger.warn("Booking with event type that has no teamId", {
      bookingId: input.bookingId,
      eventTypeId: eventType.id,
      teamId: eventType.teamId ?? -1,
    });
    return [];
  }

  const availableEventTypeUsers = eventType.hosts
    .filter((h) => !h.isFixed && h.user.id !== booking.userId)
    .map((host) => ({
      ...host.user,
      isFixed: host.isFixed,
      priority: host?.priority ?? 2,
    }));

  let availableUsers: IsFixedAwareUser[] = [];
  try {
    availableUsers = await ensureAvailableUsers(
      { ...eventType, users: availableEventTypeUsers as IsFixedAwareUser[] },
      {
        dateFrom: dayjs(booking.startTime).format(),
        dateTo: dayjs(booking.endTime).format(),
        timeZone: eventType.timeZone || "UTC",
      },
      gettingRoundRobinHostsToReassignLogger
    );
  } catch (error) {
    if (error instanceof Error && error.message === ErrorCode.NoAvailableUsersFound) {
      availableUsers = [];
    } else {
      gettingRoundRobinHostsToReassignLogger.error(error);
      // Log error and return empty array to avoid rethrowing the error
      return [];
    }
  }

  const availableUserIds = new Set(availableUsers.map((u) => u.id));

  const roundRobinHostsToReassign = availableEventTypeUsers.reduce((acc, host) => {
    const status = availableUserIds.has(host.id) ? "available" : "unavailable";
    acc.push({
      id: host.id,
      name: host.name,
      email: host.email,
      status,
    });
    return acc;
  }, [] as { id: number; name: string | null; email: string; status: string }[]);

  return roundRobinHostsToReassign;
};

export default getRoundRobinHostsToReassign;
