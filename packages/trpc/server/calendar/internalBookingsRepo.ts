import prisma from "@calcom/prisma";
import type { BookingStatus, Prisma } from "@calcom/prisma/client";
import { bookingMetadataSchema } from "@calcom/prisma/zod-utils";

import type { InternalBookingForUnifiedCalendar } from "./unifiedMapper";

export interface InternalBookingsQueryInput {
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

const getMeetingUrlFromReferences = (
  references: { type: string; meetingUrl: string | null; deleted: boolean | null }[]
) => {
  const activeReferences = references.filter((reference) => reference.deleted !== true);
  const preferredReference = activeReferences.find(
    (reference) =>
      Boolean(reference.meetingUrl) &&
      (reference.type.includes("_video") || reference.type.includes("_calendar"))
  );

  if (preferredReference?.meetingUrl) {
    return preferredReference.meetingUrl;
  }

  return activeReferences.find((reference) => Boolean(reference.meetingUrl))?.meetingUrl ?? null;
};

const getMeetingUrlFromMetadata = (metadata: unknown): string | null => {
  const parsed = bookingMetadataSchema.safeParse(metadata ?? null);
  if (!parsed.success || !parsed.data?.videoCallUrl) {
    return null;
  }
  return parsed.data.videoCallUrl;
};

export const getInternalBookingsInRange = async (
  input: InternalBookingsQueryInput
): Promise<InternalBookingForUnifiedCalendar[]> => {
  const scope: Prisma.BookingWhereInput[] = [{ userId: input.userId }];

  if (input.teamIds.length > 0) {
    scope.push({ eventType: { teamId: { in: input.teamIds } } });
  }

  if (input.calIdTeamIds.length > 0) {
    scope.push({ eventType: { calIdTeamId: { in: input.calIdTeamIds } } });
  }

  const rows = await prisma.booking.findMany({
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
      metadata: true,
      status: true,
      eventTypeId: true,
      _count: {
        select: {
          attendees: true,
        },
      },
      references: {
        select: {
          type: true,
          meetingUrl: true,
          deleted: true,
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
    meetingUrl: getMeetingUrlFromMetadata(row.metadata) ?? getMeetingUrlFromReferences(row.references),
    status: row.status,
    eventTypeId: row.eventTypeId,
    attendeeCount: row._count.attendees,
  }));
};
