import { useMutation } from "@tanstack/react-query";

import type { CALENDARS } from "@calcom/platform-constants";
import { SUCCESS_STATUS } from "@calcom/platform-constants";
import type { ApiErrorResponse, ApiResponse } from "@calcom/platform-types";

import http from "../../lib/http";

interface IUseCancelBooking {
  onSuccess?: (res: ApiResponse) => void;
  onError?: (err: ApiErrorResponse | Error) => void;
}

export const useDeleteCalendarCredentials = (
  { onSuccess, onError }: IUseCancelBooking = {
    onSuccess: () => {
      return;
    },
    onError: () => {
      return;
    },
  }
) => {
  const deleteCalendarCredentials = useMutation<
    ApiResponse<{ status: string; data: { message: string } }>,
    unknown,
    { id: number; calendar: (typeof CALENDARS)[number] }
  >({
    mutationFn: (data) => {
      const { id, calendar } = data;
      const body = {
        id,
      };

      return http.post(`/calendars/${calendar}/disconnect`, body).then((res) => {
        return res.data;
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

  return deleteCalendarCredentials;
};
