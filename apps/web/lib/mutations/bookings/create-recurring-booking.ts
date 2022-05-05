import * as fetch from "@lib/core/http/fetch-wrapper";
import { BookingCreateBody, BookingResponse } from "@lib/types/booking";

type ExtendedBookingCreateBody = BookingCreateBody & { noEmail?: boolean; recurringCount?: number };

const createRecurringBooking = async (data: ExtendedBookingCreateBody[]) => {
  return Promise.all(
    data.map((booking, key) => {
      // We only want to send the first occurrence of the meeting at the moment, not all at once
      if (key === 0) {
        return fetch.post<ExtendedBookingCreateBody, BookingResponse>("/api/book/event", booking);
      } else {
        return fetch.post<ExtendedBookingCreateBody, BookingResponse>("/api/book/event", {
          ...booking,
          noEmail: true,
        });
      }
    })
  );
};

export default createRecurringBooking;
