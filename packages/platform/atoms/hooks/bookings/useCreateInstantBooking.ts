import { useMutation } from "@tanstack/react-query";

import { useIsPlatformBookerEmbed } from "@calcom/atoms/monorepo";
import { SUCCESS_STATUS } from "@calcom/platform-constants";
import { X_CAL_CLIENT_ID } from "@calcom/platform-constants";
import type { BookingResponse } from "@calcom/platform-libraries";
import type { ApiResponse, ApiErrorResponse, ApiSuccessResponse } from "@calcom/platform-types";
import type { BookingCreateBody } from "@calcom/prisma/zod-utils";

import http from "../../lib/http";

interface IUseCreateInstantBooking {
  onSuccess?: (res: ApiSuccessResponse<BookingResponse>) => void;
  onError?: (err: ApiErrorResponse | Error) => void;
}
export const useCreateInstantBooking = (
  { onSuccess, onError }: IUseCreateInstantBooking = {
    onSuccess: () => {
      return;
    },
    onError: () => {
      return;
    },
  }
) => {
  const isPlatformBookerEmbed = useIsPlatformBookerEmbed();
  const createInstantBooking = useMutation<ApiResponse<BookingResponse>, Error, BookingCreateBody>({
    mutationFn: (data) => {
      return http
        .post<ApiResponse<BookingResponse>>("/bookings/instant", data, {
          headers: {
            ...http.instance.defaults.headers.common,
            [X_CAL_CLIENT_ID]: isPlatformBookerEmbed
              ? undefined
              : http.instance.defaults.headers.common[X_CAL_CLIENT_ID],
          },
        })
        .then((res) => {
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
  return createInstantBooking;
};
