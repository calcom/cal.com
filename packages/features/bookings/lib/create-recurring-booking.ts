import * as fetch from "@calcom/lib/fetch-wrapper";
import type { AppsStatus } from "@calcom/types/Calendar";

import type { RecurringBookingCreateBody, BookingResponse } from "../types";

// @TODO: Didn't look at the contents of this function in order to not break old booking page.
export const createRecurringBooking = async (data: RecurringBookingCreateBody[]) => {
  const createdBookings: BookingResponse[] = [];
  const allRecurringDates: string[] = data.map((booking) => booking.start);
  let appsStatus: AppsStatus[] | undefined = undefined;
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

    const response = await fetch.post<RecurringBookingCreateBody, BookingResponse>("/api/book/event", {
      ...booking,
      appsStatus,
      allRecurringDates,
      currentRecurringIndex: key,
      noEmail: key !== 0,
    });
    createdBookings.push(response);
  }
  return createdBookings;
};
