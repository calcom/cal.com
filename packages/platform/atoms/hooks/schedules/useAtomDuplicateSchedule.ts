import { useMutation, useQueryClient } from "@tanstack/react-query";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import type { ApiResponse, ApiErrorResponse } from "@calcom/platform-types";
import type { DuplicateScheduleHandlerReturn } from "@calcom/trpc/server/routers/viewer/availability/schedule/duplicate.handler";

import http from "../../lib/http";
import { QUERY_KEY as ScheduleQueryKey } from "./useAtomSchedule";

interface useAtomDuplicateScheduleOptions {
  onSuccess?: (res: ApiResponse<DuplicateScheduleHandlerReturn>) => void;
  onError?: (err: ApiErrorResponse) => void;
}

export const useAtomDuplicateSchedule = (
  { onSuccess, onError }: useAtomDuplicateScheduleOptions = {
    onSuccess: () => {
      return;
    },
    onError: () => {
      return;
    },
  }
) => {
  const queryClient = useQueryClient();

  return useMutation<ApiResponse<DuplicateScheduleHandlerReturn>, unknown, { scheduleId: number }>({
    mutationFn: async ({ scheduleId }: { scheduleId: number }) => {
      const url = `atoms/schedules/${scheduleId}/duplicate`;
      const response = await http.post<ApiResponse<DuplicateScheduleHandlerReturn>>(url);
      return response.data;
    },
    onSuccess: (data) => {
      if (data.status === SUCCESS_STATUS) {
        onSuccess?.(data);
        queryClient.invalidateQueries({ queryKey: [ScheduleQueryKey] });
      } else {
        onError?.(data);
      }
    },
    onError: (err) => {
      onError?.(err as ApiErrorResponse);
    },
  });
};
