import { post } from "@calcom/lib/fetch-wrapper";

import { BookingCreateBody, BookingResponse } from "../types";

export const createBooking = async (data: BookingCreateBody) => {
  const response = await post<BookingCreateBody, BookingResponse>("/api/book/event", data);
  return response;
};
