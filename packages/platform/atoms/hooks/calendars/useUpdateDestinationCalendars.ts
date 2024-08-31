import { useMutation, useQueryClient } from "@tanstack/react-query";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import type { ApiErrorResponse, ApiResponse } from "@calcom/platform-types";

import http from "../../lib/http";
import { QUERY_KEY } from "../useConnectedCalendars";

interface IUseUpdateDestinationCalendars {
  onSuccess?: (res: ApiResponse) => void;
  onError?: (err: ApiErrorResponse | Error) => void;
}

export const useUpdateDestinationCalendars = (
  { onSuccess, onError }: IUseUpdateDestinationCalendars = {
    onSuccess: () => {
      return;
    },
    onError: () => {
      return;
    },
  }
) => {
  const queryClient = useQueryClient();
  const updatedDestinationCalendar = useMutation<
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
    { integration: string; externalId: string }
  >({
    mutationFn: (data) => {
      return http.put(`/destination-calendars`, data).then((res) => {
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
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });

  return updatedDestinationCalendar;
};
