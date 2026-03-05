import type { BookingStatus, PrismaClient } from "@calcom/prisma/client";

import type { InternalBookingForUnifiedCalendar } from "./unifiedMapper";

export interface InternalBookingsQueryInput {
  prisma: PrismaClient;
  userId: number;
  from: Date;
  to: Date;
  take: number;
  teamIds: number[];
  calIdTeamIds: number[];
  includeCancelled: boolean;
  cursor?: {
    startTime: Date;
  } | null;
}

const CANCELLED_INTERNAL_STATUSES: BookingStatus[] = ["CANCELLED", "REJECTED"];

export const getInternalBookingsInRange = async (
  input: InternalBookingsQueryInput
): Promise<InternalBookingForUnifiedCalendar[]> => {
  const scope = [{ userId: input.userId }];

  if (input.teamIds.length > 0) {
    scope.push({ eventType: { teamId: { in: input.teamIds } } });
  }

  if (input.calIdTeamIds.length > 0) {
    scope.push({ eventType: { calIdTeamId: { in: input.calIdTeamIds } } });
  }

  const rows = await input.prisma.booking.findMany({
    where: {
      OR: scope,
      startTime: {
        lt: input.to,
        ...(input.cursor ? { gte: input.cursor.startTime } : {}),
      },
      endTime: {
        gt: input.from,
      },
      ...(input.includeCancelled ? {} : { status: { notIn: CANCELLED_INTERNAL_STATUSES } }),
    },
    orderBy: [{ startTime: "asc" }, { endTime: "asc" }, { id: "asc" }],
    take: input.take,
    select: {
      id: true,
      startTime: true,
      endTime: true,
      title: true,
      description: true,
      location: true,
      status: true,
      eventTypeId: true,
      _count: {
        select: {
          attendees: true,
        },
      },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    startTime: row.startTime,
    endTime: row.endTime,
    title: row.title,
    description: row.description,
    location: row.location,
    status: row.status,
    eventTypeId: row.eventTypeId,
    attendeeCount: row._count.attendees,
  }));
};
