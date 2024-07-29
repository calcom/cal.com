import { useMutation } from "@tanstack/react-query";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import type { ApiErrorResponse, ApiResponse } from "@calcom/platform-types";

import http from "../../lib/http";

interface IUseAddSelectedCalendar {
  onSuccess?: (res: ApiResponse) => void;
  onError?: (err: ApiErrorResponse | Error) => void;
}

export const useAddSelectedCalendar = (
  { onSuccess, onError }: IUseAddSelectedCalendar = {
    onSuccess: () => {
      return;
    },
    onError: () => {
      return;
    },
  }
) => {
  const newlyAddedCalendarEntry = useMutation<
    ApiResponse<{
      status: string;
      data: {
        userId: number;
        integration: string;
        externalId: string;
        credentialId: number | null;
      };
    }>,
    unknown,
    { credentialId: number; integration: string; externalId: string }
  >({
    mutationFn: (data) => {
      return http.post(`/selected-calendars`, data).then((res) => {
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

  return newlyAddedCalendarEntry;
};
