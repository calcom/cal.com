import { useMutation } from "@tanstack/react-query";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import type { BookingResponse } from "@calcom/platform-libraries";
import type { ApiResponse, ApiErrorResponse } from "@calcom/platform-types";
import type { BookingCreateBody } from "@calcom/prisma/zod-utils";

import http from "../lib/http";

interface IUseCreateBooking {
  onSuccess?: (res: ApiResponse<BookingResponse>) => void;
  onError?: (err: ApiErrorResponse) => void;
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
  const createBooking = useMutation<ApiResponse<BookingResponse>, unknown, BookingCreateBody>({
    mutationFn: (data) => {
      return http.post<ApiResponse<BookingResponse>>("/ee/bookings", data).then((res) => {
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
      onError?.(err as ApiErrorResponse);
    },
  });
  return createBooking;
};
