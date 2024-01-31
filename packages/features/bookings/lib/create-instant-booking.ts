import { post } from "@calcom/lib/fetch-wrapper";

import type { BookingCreateBody, InstantBookingResponse } from "../types";

export const createInstantBooking = async (data: BookingCreateBody) => {
  const response = await post<BookingCreateBody, InstantBookingResponse>("/api/book/instant-event", data);
  return response;
};
