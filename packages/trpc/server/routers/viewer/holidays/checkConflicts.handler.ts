import dayjs from "@calcom/dayjs";
import { HolidayService } from "@calcom/lib/holidays";
import prisma from "@calcom/prisma";
import { BookingStatus } from "@calcom/prisma/enums";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import type { TCheckConflictsSchema } from "./checkConflicts.schema";

type CheckConflictsOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TCheckConflictsSchema;
};

export interface ConflictingBooking {
  id: number;
  title: string;
  startTime: Date;
  endTime: Date;
  attendeeName: string | null;
}

export interface HolidayConflict {
  holidayId: string;
  holidayName: string;
  date: string;
  bookings: ConflictingBooking[];
}

export async function checkConflictsHandler({ ctx, input }: CheckConflictsOptions) {
  const userId = ctx.user.id;
  const { countryCode, disabledIds } = input;

  // Quick return if no country selected
  if (!countryCode) {
    return { conflicts: [] };
  }

  // Only check next 3 months for conflicts (performance optimization)
  const startDate = new Date();
  const endDate = dayjs().add(3, "months").toDate();

  const holidayDates = HolidayService.getHolidayDatesInRange(countryCode, disabledIds, startDate, endDate);

  if (holidayDates.length === 0) {
    return { conflicts: [] };
  }

  // Get all confirmed bookings for this user in the date range
  const bookings = await prisma.booking.findMany({
    where: {
      userId,
      status: {
        in: [BookingStatus.ACCEPTED, BookingStatus.PENDING],
      },
      startTime: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      id: true,
      title: true,
      startTime: true,
      endTime: true,
      attendees: {
        take: 1,
        select: {
          name: true,
        },
      },
    },
  });

  // Check for conflicts
  const conflicts: HolidayConflict[] = [];

  for (const holidayDate of holidayDates) {
    const holidayStart = dayjs(holidayDate.date).startOf("day");
    const holidayEnd = dayjs(holidayDate.date).endOf("day");

    const conflictingBookings = bookings.filter((booking) => {
      const bookingStart = dayjs(booking.startTime);
      const bookingEnd = dayjs(booking.endTime);

      // Check if booking overlaps with holiday
      return bookingStart.isBefore(holidayEnd) && bookingEnd.isAfter(holidayStart);
    });

    if (conflictingBookings.length > 0) {
      conflicts.push({
        holidayId: holidayDate.holiday.id,
        holidayName: holidayDate.holiday.name,
        date: holidayDate.date,
        bookings: conflictingBookings.map((b) => ({
          id: b.id,
          title: b.title,
          startTime: b.startTime,
          endTime: b.endTime,
          attendeeName: b.attendees[0]?.name || null,
        })),
      });
    }
  }

  return { conflicts };
}
