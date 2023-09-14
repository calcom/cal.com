import type { NextApiRequest, NextApiResponse } from "next";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import handleNewBooking from "@calcom/features/bookings/lib/handleNewBooking";
import type { BookingResponse, RecurringBookingCreateBody } from "@calcom/features/bookings/types";
import { defaultResponder } from "@calcom/lib/server";
import type { AppsStatus } from "@calcom/types/Calendar";

// @TODO: Didn't look at the contents of this function in order to not break old booking page.

async function handler(req: NextApiRequest & { userId?: number }, res: NextApiResponse) {
  const data: RecurringBookingCreateBody[] = req.body;
  const session = await getServerSession({ req, res });
  const createdBookings: BookingResponse[] = [];
  const allRecurringDates: string[] = data.map((booking) => booking.start);
  let appsStatus: AppsStatus[] | undefined = undefined;

  /* To mimic API behavior and comply with types */
  req.userId = session?.user?.id || -1;

  // Reversing to accumulate results for noEmail instances first, to then lastly, create the
  // emailed booking taking into account accumulated results to send app status accurately
  for (let key = data.length - 1; key >= 0; key--) {
    const booking = data[key];
    if (key === 0) {
      const calcAppsStatus: { [key: string]: AppsStatus } = createdBookings
        .flatMap((book) => (book.appsStatus !== undefined ? book.appsStatus : []))
        .reduce((prev, curr) => {
          if (prev[curr.type]) {
            prev[curr.type].failures += curr.failures;
            prev[curr.type].success += curr.success;
          } else {
            prev[curr.type] = curr;
          }
          return prev;
        }, {} as { [key: string]: AppsStatus });
      appsStatus = Object.values(calcAppsStatus);
    }

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
    });

    createdBookings.push(eachRecurringBooking);
  }
  return createdBookings;
}

export default defaultResponder(handler);
