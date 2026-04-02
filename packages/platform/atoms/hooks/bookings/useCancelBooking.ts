import { SUCCESS_STATUS } from "@calcom/platform-constants";
import type { ApiErrorResponse, ApiResponse } from "@calcom/platform-types";
import type { bookingCancelSchema } from "@calcom/prisma/zod-utils";
import { useMutation } from "@tanstack/react-query";
import type { z } from "zod";
import http from "../../lib/http";

interface IUseCancelBooking {
  onSuccess?: () => void;
  onError?: (err: ApiErrorResponse | Error) => void;
}

type inputParams = z.infer<typeof bookingCancelSchema>;

export const useCancelBooking = (
  { onSuccess, onError }: IUseCancelBooking = {
    onSuccess: () => {
      return;
    },
    onError: () => {
      return;
    },
  }
) => {
  const cancelBooking = useMutation<ApiResponse, Error, inputParams>({
    mutationFn: (data) => {
      return http.post<ApiResponse>(`/bookings/${data.uid}/cancel`, data).then((res) => {
        if (res.data.status === SUCCESS_STATUS) {
          return res.data;
        }
        throw new Error(res.data.error.message);
      });
    },
    onSuccess: (data) => {
      if (data.status === SUCCESS_STATUS) {
        onSuccess?.();
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
