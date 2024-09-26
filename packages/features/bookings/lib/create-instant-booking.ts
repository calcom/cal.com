import { post } from "@calcom/lib/fetch-wrapper";

import type { BookingCreateBody, InstantBookingResponse } from "../types";

export const createInstantBooking = async (data: BookingCreateBody) => {
  const response = await post<
    BookingCreateBody,
    // fetch response can't have a Date type, it must be a string
    Omit<InstantBookingResponse, "startTime" | "endTime"> & {
      startTime: string;
      endTime: string;
    }
  >("/api/book/instant-event", data);
  return response;
};
