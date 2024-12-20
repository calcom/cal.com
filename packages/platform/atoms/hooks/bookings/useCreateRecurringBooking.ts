import { useMutation } from "@tanstack/react-query";

import { useIsPlatformBookerEmbed } from "@calcom/atoms/monorepo";
import { X_CAL_CLIENT_ID } from "@calcom/platform-constants";
import { SUCCESS_STATUS } from "@calcom/platform-constants";
import type { BookingResponse, RecurringBookingCreateBody } from "@calcom/platform-libraries";
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
  const isPlatformBookerEmbed = useIsPlatformBookerEmbed();

  const createRecurringBooking = useMutation<
    ApiResponse<BookingResponse[]>,
    Error,
    RecurringBookingCreateBody[]
  >({
    mutationFn: (data) => {
      return http
        .post<ApiResponse<BookingResponse[]>>("/bookings/recurring", data, {
          headers: {
            ...http.instance.defaults.headers.common,
            [X_CAL_CLIENT_ID]: isPlatformBookerEmbed
              ? undefined
              : http.instance.defaults.headers.common[X_CAL_CLIENT_ID],
          },
        })
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
      onError?.(err);
    },
  });
  return createRecurringBooking;
};
