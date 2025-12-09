import dayjs from "@calcom/dayjs";
import { getHolidayService } from "@calcom/lib/holidays";
import { CONFLICT_CHECK_MONTHS } from "@calcom/lib/holidays/constants";
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

  if (!countryCode) {
    return { conflicts: [] };
  }

  const startDate = new Date();
  const endDate = dayjs().add(CONFLICT_CHECK_MONTHS, "months").toDate();

  const holidayService = getHolidayService();
  const holidayDates = await holidayService.getHolidayDatesInRange(countryCode, disabledIds, startDate, endDate);

  if (holidayDates.length === 0) {
    return { conflicts: [] };
  }

  const dateConditions = holidayDates.map((h) => {
    const holidayStart = dayjs(h.date).startOf("day").toDate();
    const holidayEnd = dayjs(h.date).endOf("day").toDate();
    return {
      AND: [{ startTime: { lt: holidayEnd } }, { endTime: { gt: holidayStart } }],
    };
  });

  const bookings = await prisma.booking.findMany({
    where: {
      userId,
      status: {
        in: [BookingStatus.ACCEPTED, BookingStatus.PENDING],
      },
      OR: dateConditions,
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

  if (bookings.length === 0) {
    return { conflicts: [] };
  }

  const bookingsWithTimestamps = bookings.map((b) => ({
    ...b,
    startTimestamp: b.startTime.getTime(),
    endTimestamp: b.endTime.getTime(),
  }));

  const conflicts: HolidayConflict[] = [];

  for (const holidayDate of holidayDates) {
    const holidayStart = dayjs(holidayDate.date).startOf("day").valueOf();
    const holidayEnd = dayjs(holidayDate.date).endOf("day").valueOf();

    const conflictingBookings = bookingsWithTimestamps.filter(
      (booking) => booking.startTimestamp < holidayEnd && booking.endTimestamp > holidayStart
    );

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

export default checkConflictsHandler;
