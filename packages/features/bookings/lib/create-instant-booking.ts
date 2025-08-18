import { post } from "@calcom/lib/fetch-wrapper";

import type { BookingCreateBody } from "../types";

// Complete type for instant booking response
export type CreateInstantBookingResponse = {
  message: string;
  meetingTokenId: number;
  bookingId: number;
  bookingUid: string;
  expires: string; // ISO date string
  userId: number | null;
};

export const createInstantBooking = async (
  data: BookingCreateBody
): Promise<CreateInstantBookingResponse> => {
  const response = await post<BookingCreateBody, CreateInstantBookingResponse>(
    "/api/book/instant-event",
    data
  );
  return response;
};
