import { post } from "@calcom/lib/fetch-wrapper";

import type { BookingCreateBody, InstatBookingResponse } from "../types";

export const createInstantBooking = async (data: BookingCreateBody) => {
  const response = await post<BookingCreateBody, InstatBookingResponse>("/api/book/instant-event", data);
  return response;
};
