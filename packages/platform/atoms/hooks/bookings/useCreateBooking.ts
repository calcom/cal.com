import type { BookingCreateBody } from "@calcom/features/bookings/lib/bookingCreateBodySchema";
import type { BookingResponse } from "@calcom/features/bookings/types";
import { SUCCESS_STATUS } from "@calcom/platform-constants";
import type { ApiErrorResponse, ApiResponse, ApiSuccessResponse } from "@calcom/platform-types";
import { useMutation } from "@tanstack/react-query";
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
      onError?.(err);
    },
  });
  return createBooking;
};
