import * as fetch from "@lib/core/http/fetch-wrapper";
import { BookingCreateBody, BookingResponse } from "@lib/types/booking";

type BookingCreateBodyForQuery = Omit<BookingCreateBody, "location">;
const createBooking = async (data: BookingCreateBodyForQuery) => {
  const response = await fetch.post<BookingCreateBodyForQuery, BookingResponse>("/api/book/event", data);

  return response;
};

export default createBooking;
