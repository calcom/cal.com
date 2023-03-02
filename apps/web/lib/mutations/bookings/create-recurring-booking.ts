import type { BookingCreateBody } from "@calcom/prisma/zod-utils";
import type { AppsStatus } from "@calcom/types/Calendar";

import * as fetch from "@lib/core/http/fetch-wrapper";
import type { BookingResponse } from "@lib/types/booking";

type ExtendedBookingCreateBody = BookingCreateBody & {
  noEmail?: boolean;
  recurringCount?: number;
  appsStatus?: AppsStatus[] | undefined;
  allRecurringDates?: string[];
  currentRecurringIndex?: number;
};

const createRecurringBooking = async (data: ExtendedBookingCreateBody[]) => {
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

    const response = await fetch.post<ExtendedBookingCreateBody, BookingResponse>("/api/book/event", {
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

export default createRecurringBooking;
