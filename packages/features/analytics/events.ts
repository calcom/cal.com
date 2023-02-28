import type { Dayjs } from "@calcom/dayjs";
import dayjs from "@calcom/dayjs";
import { prisma } from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";

interface ITimeRange {
  start: Dayjs;
  end: Dayjs;
}

class EventsAnalytics {
  static getBookingsInTimeRange = async (timeRange: ITimeRange, where: Prisma.BookingWhereInput) => {
    const { start, end } = timeRange;

    const events = await prisma.booking.count({
      where: {
        ...where,
        createdAt: {
          gte: start.toISOString(),
          lte: end.toISOString(),
        },
      },
    });

    return events;
  };

  static getCreatedEventsInTimeRange = async (timeRange: ITimeRange, where: Prisma.BookingWhereInput) => {
    const result = await this.getBookingsInTimeRange(timeRange, where);

    return result;
  };

  static getCancelledEventsInTimeRange = async (timeRange: ITimeRange, where: Prisma.BookingWhereInput) => {
    const result = await this.getBookingsInTimeRange(timeRange, {
      ...where,
      status: "CANCELLED",
    });

    return result;
  };

  static getCompletedEventsInTimeRange = async (timeRange: ITimeRange, where: Prisma.BookingWhereInput) => {
    const result = await this.getBookingsInTimeRange(timeRange, {
      ...where,
      status: "ACCEPTED",
      endTime: {
        lte: dayjs().toISOString(),
      },
    });

    return result;
  };

  static getRescheduledEventsInTimeRange = async (timeRange: ITimeRange, where: Prisma.BookingWhereInput) => {
    const result = await this.getBookingsInTimeRange(timeRange, {
      ...where,
      rescheduled: true,
    });

    return result;
  };

  static getBaseBookingForEventStatus = async (where: Prisma.BookingWhereInput) => {
    const baseBookings = await prisma.booking.findMany({
      where,
      select: {
        id: true,
        eventType: true,
      },
    });

    return baseBookings;
  };

  static getTotalRescheduledEvents = async (bookingIds: number[]) => {
    return await prisma.booking.count({
      where: {
        id: {
          in: bookingIds,
        },
        rescheduled: true,
      },
    });
  };

  static getTotalCancelledEvents = async (bookingIds: number[]) => {
    return await prisma.booking.count({
      where: {
        id: {
          in: bookingIds,
        },
        status: "CANCELLED",
      },
    });
  };
}

export { EventsAnalytics };
