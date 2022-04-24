import * as fetch from "@lib/core/http/fetch-wrapper";
import { BookingCreateBody, BookingResponse } from "@lib/types/booking";

type ExtendedBookingCreateBody = BookingCreateBody & { noEmail?: boolean };

const createRecurringBooking = async (data: BookingCreateBody[]) => {
  return Promise.all(
    data.map((booking, key) => {
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
