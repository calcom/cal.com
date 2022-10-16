import { AppsStatus } from "@calcom/types/Calendar";

import * as fetch from "@lib/core/http/fetch-wrapper";
import { BookingCreateBody, BookingResponse } from "@lib/types/booking";

type ExtendedBookingCreateBody = BookingCreateBody & {
  noEmail?: boolean;
  recurringCount?: number;
  appsStatus: BookingResponse["appsStatus"];
};

const createRecurringBooking = async (data: ExtendedBookingCreateBody[]) => {
  const createdBookings: BookingResponse[] = [];
  return Promise.all(
    // Reversing to accumulate results for noEmail instances first, to then lastly, create the
    // emailed booking taking into account accumulated results to send app status accurately
    data.reverse().map(async (booking, key) => {
      // We only want to send the first occurrence of the meeting at the moment, not all at once
      if (key === data.length) {
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
        return fetch.post<ExtendedBookingCreateBody, BookingResponse>("/api/book/event", {
          ...booking,
          appsStatus,
        });
      } else {
        const response = await fetch.post<ExtendedBookingCreateBody, BookingResponse>("/api/book/event", {
          ...booking,
          noEmail: true,
        });
        createdBookings.push(response);
        return response;
      }
    })
  );
};

export default createRecurringBooking;
