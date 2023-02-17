import prisma from "@calcom/prisma";

export const getTotalBookingDuration = async ({
  eventId,
  startDate,
  endDate,
}: {
  eventId: number;
  startDate: Date;
  endDate: Date;
}) => {
  // Aggregates the total booking time for a given event in a given time period
  const [totalBookingTime] = (await prisma.$queryRaw`
    SELECT SUM(EXTRACT(EPOCH FROM ("endTime" - "startTime")) / 60) as "totalMinutes"
    FROM "Booking"
    WHERE "status" = 'accepted'
      AND "id" = ${eventId}
      AND "startTime" >= ${startDate}
      AND "endTime" <= ${endDate};
  `) as { totalMinutes: number }[];

  return totalBookingTime.totalMinutes;
};
