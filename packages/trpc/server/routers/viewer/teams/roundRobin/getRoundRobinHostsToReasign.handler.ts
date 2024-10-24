import dayjs from "@calcom/dayjs";
import { ensureAvailableUsers } from "@calcom/features/bookings/lib/handleNewBooking/ensureAvailableUsers";
import { getEventTypesFromDB } from "@calcom/features/bookings/lib/handleNewBooking/getEventTypesFromDB";
import type { IsFixedAwareUser } from "@calcom/features/bookings/lib/handleNewBooking/types";
import logger from "@calcom/lib/logger";
import type { PrismaClient } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import type { TGetRoundRobinHostsToReassignInputSchema } from "./getRoundRobinHostsToReasign.schema";

type GetRoundRobinHostsToReassignOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    prisma: PrismaClient;
  };
  input: TGetRoundRobinHostsToReassignInputSchema;
};

async function isTeamAdmin(prisma: PrismaClient, userId: number, teamId: number) {
  const membership = await prisma.membership.findFirst({
    where: { userId, teamId, role: { in: [MembershipRole.ADMIN, MembershipRole.OWNER] } },
  });
  return membership?.role ?? false;
}

export const getRoundRobinHostsToReassign = async ({ ctx, input }: GetRoundRobinHostsToReassignOptions) => {
  const { prisma } = ctx;
  const { isOrgAdmin } = ctx.user.organization;

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

  if (!eventType || !eventType.teamId) {
    throw new Error("Event type not found");
  }

  const availableEventTypeUsers = eventType.hosts
    .filter((h) => !h.isFixed && h.user.id !== booking.userId)
    .map((host) => ({
      ...host.user,
      isFixed: host.isFixed,
      priority: host?.priority ?? 2,
    }));

  const availableUsers = await ensureAvailableUsers(
    { ...eventType, users: availableEventTypeUsers as IsFixedAwareUser[] },
    {
      dateFrom: dayjs(booking.startTime).format(),
      dateTo: dayjs(booking.endTime).format(),
      timeZone: eventType.timeZone || "UTC",
    },
    gettingRoundRobinHostsToReassignLogger
  );

  const availableUserIds = new Set(availableUsers.map((u) => u.id));

  const canViewReassignBusyUsers = isOrgAdmin || (await isTeamAdmin(prisma, ctx.user.id, eventType.teamId));

  const roundRobinHostsToReassign = availableEventTypeUsers.reduce((acc, host) => {
    const status = availableUserIds.has(host.id) ? "available" : "unavailable";
    if (canViewReassignBusyUsers || status === "available") {
      acc.push({
        id: host.id,
        name: host.name,
        email: host.email,
        status,
      });
    }
    return acc;
  }, [] as { id: number; name: string | null; email: string; status: string }[]);

  return roundRobinHostsToReassign;
};

export default getRoundRobinHostsToReassign;
