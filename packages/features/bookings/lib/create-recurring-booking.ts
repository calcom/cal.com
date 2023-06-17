import { post } from "@calcom/lib/fetch-wrapper";

import type { RecurringBookingCreateBody, BookingResponse } from "../types";

// @TODO: Didn't look at the contents of this function in order to not break old booking page.
export const createRecurringBooking = async (data: RecurringBookingCreateBody[]) => {
  const response = await post<RecurringBookingCreateBody[], BookingResponse[]>(
    "/api/book/recurring-event",
    data
  );
  return response;
};
