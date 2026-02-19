import { post } from "@calcom/lib/fetch-wrapper";

import type { BookingCreateBody } from "../types";
import type { InstantBookingCreateResult } from "./dto/types";

export const createInstantBooking = async (data: BookingCreateBody) => {
  const response = await post<
    BookingCreateBody,
    InstantBookingCreateResult
  >("/api/book/instant-event", data);
  return response;
};
