import { post } from "@calcom/lib/fetch-wrapper";
import type { BookingCreateBody } from "../types";
import type { InstantBookingCreateResult } from "./dto/types";

export const createInstantBooking = async (data: BookingCreateBody) => {
  const response = await post<
    BookingCreateBody,
    // TODO: Fetch response can't have a Date type, it must be a string. We need to type expires as a string here but it breaks types down the line, fix it in a follow-up PR.
    InstantBookingCreateResult
  >("/api/book/instant-event", data);
  return response;
};
