import { useMutation } from "@tanstack/react-query";

import type { BookingResponse, RecurringBookingCreateBody } from "@calcom/features/bookings/types";
import { SUCCESS_STATUS } from "@calcom/platform-constants";
import type { ApiResponse, ApiErrorResponse, ApiSuccessResponse } from "@calcom/platform-types";

import http from "../../lib/http";

interface IUseCreateRecurringBooking {
  onSuccess?: (res: ApiSuccessResponse<BookingResponse[]>) => void;
  onError?: (err: ApiErrorResponse | Error) => void;
}

export const useCreateRecurringBooking = (
  { onSuccess, onError }: IUseCreateRecurringBooking = {
    onSuccess: () => {
      return;
    },
    onError: () => {
      return;
    },
  }
) => {
  const createRecurringBooking = useMutation<
    ApiResponse<BookingResponse[]>,
    Error,
    RecurringBookingCreateBody[]
  >({
    mutationFn: (data) => {
      return http.post<ApiResponse<BookingResponse[]>>("/bookings/recurring", data).then((res) => res.data);
    },
    onSuccess: (data) => {
      if (data.status === SUCCESS_STATUS) {
        onSuccess?.(data);
      } else {
        onError?.(data);
      }
    },
    onError: (err) => {
      onError?.(err);
    },
  });
  return createRecurringBooking;
};
