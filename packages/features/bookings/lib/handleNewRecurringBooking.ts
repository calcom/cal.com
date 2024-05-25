import type { NextApiRequest } from "next";

import dayjs from "@calcom/dayjs";
import { sendScheduledEmails } from "@calcom/emails";
import handleNewBooking from "@calcom/features/bookings/lib/handleNewBooking";
import type { RecurringBookingCreateBody, BookingResponse } from "@calcom/features/bookings/types";
import { getTranslation } from "@calcom/lib/server";
import { getTimeFormatStringFromUserTimeFormat } from "@calcom/lib/timeFormat";
import { SchedulingType } from "@calcom/prisma/client";
import type { AppsStatus, CalendarEvent } from "@calcom/types/Calendar";

function groupEventsByUser(events: BookingResponse[]) {
  const groupedEvents: {
    user: string;
    bookings: BookingResponse[];
  }[] = [];

  events.forEach((event) => {
    const existingUserGroup = groupedEvents.find((group) => group.user === event.user.name);
    if (existingUserGroup) {
      existingUserGroup.bookings.push(event);
    } else {
      groupedEvents.push({
        user: event.user.name || "",
        bookings: [event],
      });
    }
  });

  return groupedEvents;
}

export const handleNewRecurringBooking = async (
  req: NextApiRequest & { userId?: number }
): Promise<BookingResponse[]> => {
  const data: RecurringBookingCreateBody[] = req.body;
  const createdBookings: BookingResponse[] = [];
  const allRecurringDates: { start: string | undefined; end: string | undefined }[] = data.map((booking) => {
    return { start: booking.start, end: booking.end };
  });
  const appsStatus: AppsStatus[] | undefined = undefined;

  const numSlotsToCheckForAvailability = 2;

  let thirdPartyRecurringEventId = null;

  // for round robin, the first slot needs to be handled first to define the lucky user
  const firstBooking = data[0];
  const isRoundRobin = firstBooking.schedulingType === SchedulingType.ROUND_ROBIN;

  let luckyUsers = undefined;
  let differentRoundRobinRecurringHosts = undefined;

  if (isRoundRobin) {
    const recurringEventReq: NextApiRequest & { userId?: number } = req;

    recurringEventReq.body = {
      ...firstBooking,
      appsStatus,
      allRecurringDates,
      isFirstRecurringSlot: true,
      thirdPartyRecurringEventId,
      numSlotsToCheckForAvailability,
      currentRecurringIndex: 0,
      noEmail: false,
    };

    const firstBookingResult = await handleNewBooking(recurringEventReq);
    luckyUsers = firstBookingResult.luckyUsers;
    differentRoundRobinRecurringHosts = firstBookingResult.differentRoundRobinRecurringHosts;
    createdBookings.push(firstBookingResult);
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

    const recurringEventReq: NextApiRequest & { userId?: number } = req;

    recurringEventReq.body = {
      ...booking,
      appsStatus,
      allRecurringDates,
      isFirstRecurringSlot: key == 0,
      thirdPartyRecurringEventId,
      numSlotsToCheckForAvailability,
      currentRecurringIndex: key,
      noEmail: key !== 0,
      luckyUsers,
    };

    const promiseEachRecurringBooking: ReturnType<typeof handleNewBooking> =
      handleNewBooking(recurringEventReq);

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

  if (differentRoundRobinRecurringHosts) {
    const userBookings = groupEventsByUser(createdBookings);
    userBookings.forEach(async (user) => {
      if (!user.bookings) return;

      const booking = user.bookings[0];
      const organizer = booking.user;

      if (!organizer && booking.hostEmailDisabled) return;

      const tOrganizer = await getTranslation(organizer.locale ?? "en", "common");
      const evt: CalendarEvent = {
        multiTimes: user.bookings.map((booking) => ({
          startTime: dayjs(booking.startTime).utc().format(),
          endTime: dayjs(booking.endTime).utc().format(),
        })),
        title: booking.title || "",
        startTime: dayjs(booking.startTime).utc().format(),
        endTime: dayjs(booking.endTime).utc().format(),
        organizer: {
          name: organizer.name || "Nameless",
          email: booking.userPrimaryEmail || "",
          timeZone: organizer.timeZone || "",
          language: { locale: organizer.locale ?? "en", translate: tOrganizer },
          timeFormat: getTimeFormatStringFromUserTimeFormat(organizer.timeFormat),
        },
        ...booking,
      };
      await sendScheduledEmails(evt, undefined, booking.hostEmailDisabled, true);
    });
  }
  return createdBookings;
};
