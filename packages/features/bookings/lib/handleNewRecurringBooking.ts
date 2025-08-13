import handleNewBooking from "@calcom/features/bookings/lib/handleNewBooking";
import type { BookingResponse } from "@calcom/features/bookings/types";
import { SchedulingType } from "@calcom/prisma/client";
import type { AppsStatus } from "@calcom/types/Calendar";
import { HttpError } from "@calcom/lib/http-error";
import { ErrorCode } from "@calcom/lib/errorCodes";
import prisma from "@calcom/prisma";
import { BookingStatus } from "@calcom/prisma/enums";

export type PlatformParams = {
  platformClientId?: string;
  platformCancelUrl?: string;
  platformBookingUrl?: string;
  platformRescheduleUrl?: string;
  platformBookingLocation?: string;
  areCalendarEventsEnabled?: boolean;
};

export type BookingHandlerInput = {
  bookingData: Record<string, any>[];
  userId?: number;
  // These used to come from headers but now we're passing them as params
  hostname?: string;
  forcedSlug?: string;
  noEmail?: boolean;
} & PlatformParams;

/**
 * Check for overlapping bookings across all recurring dates
 */
async function checkForOverlappingRecurringBookings({
  eventTypeId,
  recurringDates,
  rescheduleUid,
}: {
  eventTypeId: number;
  recurringDates: { start: string | undefined; end: string | undefined }[];
  rescheduleUid?: string;
}) {
  for (const date of recurringDates) {
    if (!date.start || !date.end) continue;

    const startTime = new Date(date.start);
    const endTime = new Date(date.end);

    const overlappingBookings = await prisma.booking.findFirst({
      where: {
        eventTypeId,
        status: {
          in: [BookingStatus.ACCEPTED, BookingStatus.PENDING],
        },
        // Check for overlapping time ranges
        OR: [
          // New booking starts during an existing booking
          {
            startTime: { lte: startTime },
            endTime: { gt: startTime },
          },
          // New booking ends during an existing booking
          {
            startTime: { lt: endTime },
            endTime: { gte: endTime },
          },
          // New booking completely contains an existing booking
          {
            startTime: { gte: startTime },
            endTime: { lte: endTime },
          },
          // New booking is completely contained within an existing booking
          {
            startTime: { lte: startTime },
            endTime: { gte: endTime },
          },
        ],
        // Exclude the booking being rescheduled
        ...(rescheduleUid && { uid: { not: rescheduleUid } }),
      },
      select: {
        id: true,
        uid: true,
        startTime: true,
        endTime: true,
        status: true,
      },
    });

    if (overlappingBookings) {
      throw new HttpError({
        statusCode: 409,
        message: ErrorCode.BookingConflict,
      });
    }
  }
}

export const handleNewRecurringBooking = async (input: BookingHandlerInput): Promise<BookingResponse[]> => {
  const data = input.bookingData;
  const createdBookings: BookingResponse[] = [];
  const allRecurringDates: { start: string | undefined; end: string | undefined }[] = data.map((booking) => {
    return { start: booking.start, end: booking.end };
  });
  const appsStatus: AppsStatus[] | undefined = undefined;

  const numSlotsToCheckForAvailability = 1;

  let thirdPartyRecurringEventId = null;

  // for round robin, the first slot needs to be handled first to define the lucky user
  const firstBooking = data[0];
  const isRoundRobin = firstBooking.schedulingType === SchedulingType.ROUND_ROBIN;

  let luckyUsers = undefined;

  const handleBookingMeta = {
    userId: input.userId,
    platformClientId: input.platformClientId,
    platformRescheduleUrl: input.platformRescheduleUrl,
    platformCancelUrl: input.platformCancelUrl,
    platformBookingUrl: input.platformBookingUrl,
    platformBookingLocation: input.platformBookingLocation,
    areCalendarEventsEnabled: input.areCalendarEventsEnabled,
  };

  // Check for overlapping bookings before processing any recurring bookings
  await checkForOverlappingRecurringBookings({
    eventTypeId: firstBooking.eventTypeId,
    recurringDates: allRecurringDates,
    rescheduleUid: firstBooking.rescheduleUid,
  });

  if (isRoundRobin) {
    const recurringEventData = {
      ...firstBooking,
      appsStatus,
      allRecurringDates,
      isFirstRecurringSlot: true,
      thirdPartyRecurringEventId,
      numSlotsToCheckForAvailability,
      currentRecurringIndex: 0,
      noEmail: input.noEmail !== undefined ? input.noEmail : false,
    };

    const firstBookingResult = await handleNewBooking({
      bookingData: recurringEventData,
      hostname: input.hostname || "",
      forcedSlug: input.forcedSlug as string | undefined,
      ...handleBookingMeta,
    });
    luckyUsers = firstBookingResult.luckyUsers;
  }

  for (let key = isRoundRobin ? 1 : 0; key < data.length; key++) {
    const booking = data[key];
    // Disable AppStatus in Recurring Booking Email as it requires us to iterate backwards to be able to compute the AppsStatus for all the bookings except the very first slot and then send that slot's email with statuses
    // It is also doubtful that how useful is to have the AppsStatus of all the bookings in the email.
    // It is more important to iterate forward and check for conflicts for only first few bookings defined by 'numSlotsToCheckForAvailability'
    // if (key === 0) {
    //   const calcAppsStatus: { [key: string]: AppsStatus } = createdBookings
    //     .flatMap((book) => (book.appsStatus !== undefined ? book.appsStatus : []))
    //     .reduce((prev, curr) => {
    //       if (prev[curr.type]) {
    //         prev[curr.type].failures += curr.failures;
    //         prev[curr.type].success += curr.success;
    //       } else {
    //         prev[curr.type] = curr;
    //       }
    //       return prev;
    //     }, {} as { [key: string]: AppsStatus });
    //   appsStatus = Object.values(calcAppsStatus);
    // }

    const recurringEventData = {
      ...booking,
      appsStatus,
      allRecurringDates,
      isFirstRecurringSlot: key == 0,
      thirdPartyRecurringEventId,
      numSlotsToCheckForAvailability,
      currentRecurringIndex: key,
      noEmail: input.noEmail !== undefined ? input.noEmail : key !== 0,
      luckyUsers,
    };

    const promiseEachRecurringBooking: ReturnType<typeof handleNewBooking> = handleNewBooking({
      hostname: input.hostname || "",
      forcedSlug: input.forcedSlug as string | undefined,
      bookingData: recurringEventData,
      ...handleBookingMeta,
    });

    const eachRecurringBooking = await promiseEachRecurringBooking;

    createdBookings.push(eachRecurringBooking);

    if (!thirdPartyRecurringEventId) {
      if (eachRecurringBooking.references && eachRecurringBooking.references.length > 0) {
        for (const reference of eachRecurringBooking.references!) {
          if (reference.thirdPartyRecurringEventId) {
            thirdPartyRecurringEventId = reference.thirdPartyRecurringEventId;
            break;
          }
        }
      }
    }
  }
  return createdBookings;
};
