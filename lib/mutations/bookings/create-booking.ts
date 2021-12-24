import * as fetch from "@lib/core/http/fetch-wrapper";
import { BookingCreateBody, BookingResponse } from "@lib/types/booking";

const createBooking = async (data: BookingCreateBody) => {
  const response = await fetch.post<BookingCreateBody, BookingResponse>("/api/book/event", data);

  return response;
};

export const createBookingPac = async (data: BookingCreateBody) => {
  console.info("API call", data);
  const response = await fetch.post<BookingCreateBody, BookingResponse>("/api/book/pac-event", data);

  return response;
};

export default createBooking;
