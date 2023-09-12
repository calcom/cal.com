import { post } from "@calcom/lib/fetch-wrapper";

import type { RecurringBookingCreateBody, BookingResponse } from "../types";

export const createRecurringBooking = async (data: RecurringBookingCreateBody[]) => {
  const response = await post<RecurringBookingCreateBody[], BookingResponse[]>(
    "/api/book/recurring-event",
    data
  );
  return response;
};
