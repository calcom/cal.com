import type { NextApiRequest, NextApiResponse } from "next";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import handleNewBooking from "@calcom/features/bookings/lib/handleNewBooking";
import type { BookingResponse, RecurringBookingCreateBody } from "@calcom/features/bookings/types";
import { checkRateLimitAndThrowError } from "@calcom/lib/checkRateLimitAndThrowError";
import getIP from "@calcom/lib/getIP";
import { defaultResponder } from "@calcom/lib/server";
import type { AppsStatus } from "@calcom/types/Calendar";

// @TODO: Didn't look at the contents of this function in order to not break old booking page.

async function handler(req: NextApiRequest & { userId?: number }, res: NextApiResponse) {
  const userIp = getIP(req);

  await checkRateLimitAndThrowError({
    rateLimitingType: "core",
    identifier: userIp,
  });
  const data: RecurringBookingCreateBody[] = req.body;
  const session = await getServerSession({ req, res });
  const createdBookings: BookingResponse[] = [];
  const allRecurringDates: string[] = data.map((booking) => booking.start);
  const appsStatus: AppsStatus[] | undefined = undefined;

  /* To mimic API behavior and comply with types */
  req.userId = session?.user?.id || -1;
  const numSlotsToCheckForAvailability = 2;

  for (let key = 0; key < data.length; key++) {
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
      currentRecurringIndex: key,
      noEmail: key !== 0,
    };

    const eachRecurringBooking = await handleNewBooking(recurringEventReq, {
      isNotAnApiCall: true,
      skipAvailabilityCheck: key >= numSlotsToCheckForAvailability,
    });

    createdBookings.push(eachRecurringBooking);
  }
  return createdBookings;
}

export const handleRecurringEventBooking = handler;

export default defaultResponder(handler);
