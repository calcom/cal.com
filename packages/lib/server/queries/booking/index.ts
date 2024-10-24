import prisma from "@calcom/prisma";

export const getTotalBookingDuration = async ({
  eventId,
  startDate,
  endDate,
  rescheduleUid,
}: {
  eventId: number;
  startDate: Date;
  endDate: Date;
  rescheduleUid?: string;
}) => {
  // Aggregates the total booking time for a given event in a given time period
  // FIXME: bookings that overlap on one side will never be counted
  let totalBookingTime;

  if (rescheduleUid) {
    [totalBookingTime] = await prisma.$queryRaw<[{ totalMinutes: number | null }]>`
    SELECT SUM(EXTRACT(EPOCH FROM ("endTime" - "startTime")) / 60) as "totalMinutes"
    FROM "Booking"
    WHERE "status" = 'accepted'
      AND "eventTypeId" = ${eventId}
      AND "startTime" >= ${startDate}
      AND "endTime" <= ${endDate}
      AND "uid" != ${rescheduleUid};
  `;
  } else {
    [totalBookingTime] = await prisma.$queryRaw<[{ totalMinutes: number | null }]>`
    SELECT SUM(EXTRACT(EPOCH FROM ("endTime" - "startTime")) / 60) as "totalMinutes"
    FROM "Booking"
    WHERE "status" = 'accepted'
      AND "eventTypeId" = ${eventId}
      AND "startTime" >= ${startDate}
      AND "endTime" <= ${endDate};
  `;
  }
  return totalBookingTime.totalMinutes ?? 0;
};
