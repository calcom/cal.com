import { useMutation } from "@tanstack/react-query";

import type { RecurringBookingCreateBody } from "@calcom/features/bookings/types";
import type { BookingResponse } from "@calcom/platform-libraries";
import type { ApiResponse } from "@calcom/platform-types";

import http from "../lib/http";

export const useCreateRecurringBooking = (props: RecurringBookingCreateBody[]) => {
  const createRecurringBooking = useMutation({
    mutationFn: () => {
      return http
        .post<ApiResponse<BookingResponse[]>>("/ee/bookings/recurring", {
          body: props,
        })
        .then((res) => res.data);
    },
  });
  return createRecurringBooking;
};
