import { useMutation } from "@tanstack/react-query";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import type { BookingResponse } from "@calcom/platform-libraries";
import type { ApiResponse, ApiErrorResponse, ApiSuccessResponse } from "@calcom/platform-types";
import type { schemaBookingCancelParams } from "@calcom/prisma/zod-utils";

import http from "../lib/http";

interface IUseCancelBooking {
  bookingId: number;
  onSuccess?: (res: ApiSuccessResponse<BookingResponse>) => void;
  onError?: (err: ApiErrorResponse | Error) => void;
}

export const useCancelBooking = (
  { onSuccess, onError, bookingId }: IUseCancelBooking = {
    onSuccess: () => {
      return;
    },
    onError: () => {
      return;
    },
    bookingId,
  }
) => {
  const cancelBooking = useMutation<ApiResponse<BookingResponse>, Error, typeof schemaBookingCancelParams>({
    mutationFn: (data) => {
      return http.post<ApiResponse<BookingResponse>>(`/ee/bookings/${bookingId}/cancel`, data).then((res) => {
        if (res.data.status === SUCCESS_STATUS) {
          return res.data;
        }
        throw new Error(res.data.error.message);
      });
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
  return cancelBooking;
};
