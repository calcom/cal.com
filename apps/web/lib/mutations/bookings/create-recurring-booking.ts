import { AppsStatus } from "@calcom/types/Calendar";

import * as fetch from "@lib/core/http/fetch-wrapper";
import { BookingCreateBody, BookingResponse } from "@lib/types/booking";

type ExtendedBookingCreateBody = BookingCreateBody & {
  noEmail?: boolean;
  recurringCount?: number;
};

const createRecurringBooking = async (data: ExtendedBookingCreateBody[]) => {
  const createdBookings: BookingResponse[] = [];
  // Reversing to accumulate results for noEmail instances first, to then lastly, create the
  // emailed booking taking into account accumulated results to send app status accurately
  for (const [key, booking] of data.reverse().entries()) {
    if (key === data.length - 1) {
      const calcAppsStatus = createdBookings
        .flatMap((book) => book.appsStatus)
        .reduce((prev, curr) => {
          if (prev[curr.type]) {
            prev[curr.type].failures += curr.failures;
            prev[curr.type].success += curr.success;
          } else {
            prev[curr.type] = curr;
          }
          return prev;
        }, {} as { [key: string]: AppsStatus });
      const appsStatus = Object.values(calcAppsStatus);
      const response = await fetch.post<
        ExtendedBookingCreateBody & { appsStatus: AppsStatus[] },
        BookingResponse
      >("/api/book/event", {
        ...booking,
        appsStatus,
      });
      createdBookings.push(response);
    } else {
      const response = await fetch.post<ExtendedBookingCreateBody, BookingResponse>("/api/book/event", {
        ...booking,
        noEmail: true,
      });
      createdBookings.push(response);
    }
  }
  return createdBookings;
};

export default createRecurringBooking;
