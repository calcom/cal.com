import { useMutation } from "@tanstack/react-query";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import type { BookingResponse } from "@calcom/platform-libraries";
import type { ApiResponse, ApiErrorResponse } from "@calcom/platform-types";

import http from "../lib/http";

interface IUseCreateRecurringBooking {
  onSuccess?: (res: ApiResponse<BookingResponse[]>) => void;
  onError?: (err: ApiErrorResponse) => void;
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
    unknown,
    IUseCreateRecurringBooking
  >({
    mutationFn: (data) => {
      return http
        .post<ApiResponse<BookingResponse[]>>("/ee/bookings/recurring", data)
        .then((res) => res.data);
    },
    onSuccess: (data) => {
      if (data.status === SUCCESS_STATUS) {
        onSuccess?.(data);
      } else {
        onError?.(data);
      }
    },
    onError: (err) => {
      onError?.(err as ApiErrorResponse);
    },
  });
  return createRecurringBooking;
};
