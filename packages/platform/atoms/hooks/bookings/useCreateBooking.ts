import { useMutation } from "@tanstack/react-query";

import type { BookingCreateBody } from "@calcom/features/bookings/lib/bookingCreateBodySchema";
import type { BookingResponse } from "@calcom/features/bookings/types";
import { SUCCESS_STATUS } from "@calcom/platform-constants";
import type { ApiResponse, ApiErrorResponse, ApiSuccessResponse } from "@calcom/platform-types";

import http from "../../lib/http";

export type UseCreateBookingInput = BookingCreateBody & { locationUrl?: string };

interface IUseCreateBooking {
  onSuccess?: (res: ApiSuccessResponse<BookingResponse>) => void;
  onError?: (err: ApiErrorResponse | Error) => void;
}
export const useCreateBooking = (
  { onSuccess, onError }: IUseCreateBooking = {
    onSuccess: () => {
      return;
    },
    onError: () => {
      return;
    },
  }
) => {
  const createBooking = useMutation<ApiResponse<BookingResponse>, Error, UseCreateBookingInput>({
    mutationFn: (data) => {
      return http.post<ApiResponse<BookingResponse>>("/bookings", data).then((res) => {
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
      // Normalize error to ensure consistent structure for consumers
      // Some errors may be plain Error objects without axios properties
      const normalizedError = {
        message: err.message || "An error occurred",
        // Preserve axios properties if they exist
        ...("config" in err && err.config ? { config: err.config } : {}),
        ...("response" in err && err.response ? { response: err.response } : {}),
        ...("request" in err && err.request ? { request: err.request } : {}),
        // Include original error for debugging
        originalError: err,
      };
      onError?.(normalizedError as ApiErrorResponse | Error);
    },
  });
  return createBooking;
};
