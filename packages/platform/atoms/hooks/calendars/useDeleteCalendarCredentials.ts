import type { CALENDARS } from "@calcom/platform-constants";
import { SUCCESS_STATUS } from "@calcom/platform-constants";
import type { ApiErrorResponse, ApiResponse } from "@calcom/platform-types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import http from "../../lib/http";
import { QUERY_KEY } from "../useConnectedCalendars";

interface IUseDeleteCalendarCredentials {
  onSuccess?: (res: ApiResponse) => void;
  onError?: (err: ApiErrorResponse | Error) => void;
}

export const useDeleteCalendarCredentials = (
  { onSuccess, onError }: IUseDeleteCalendarCredentials = {
    onSuccess: () => {
      return;
    },
    onError: () => {
      return;
    },
  }
) => {
  const queryClient = useQueryClient();
  const deleteCalendarCredentials = useMutation<
    ApiResponse<{
      status: string;
      data: {
        id: number;
        type: string;
        userId: number | null;
        teamId: number | null;
        appId: string | null;
        invalid: boolean | null;
      };
    }>,
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
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });

  return deleteCalendarCredentials;
};
