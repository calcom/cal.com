import { post } from "@calcom/lib/fetch-wrapper";

import type { BookingCreateBody, BookingResponse } from "../types";

export const createBooking = async (data: BookingCreateBody) => {
  const response = await post<
    Omit<BookingCreateBody, "startTime" | "endTime">,
    BookingResponse & {
      startTime: string;
      endTime: string;
    }
  >("/api/book/event", data);
  return response;
};
