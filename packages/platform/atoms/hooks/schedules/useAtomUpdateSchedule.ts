import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { UpdateScheduleResponse } from "@calcom/features/schedules/services/ScheduleService";
import { SUCCESS_STATUS } from "@calcom/platform-constants";
import type { ApiResponse, ApiErrorResponse, UpdateAtomScheduleDto } from "@calcom/platform-types";

import http from "../../lib/http";
import { QUERY_KEY as ScheduleQueryKey } from "./useAtomSchedule";

interface IUseAtomUpdateScheduleOptions {
  onSuccess?: (res: ApiResponse<UpdateScheduleResponse>) => void;
  onError?: (err: ApiErrorResponse) => void;
}

export const useAtomUpdateSchedule = (
  { onSuccess, onError }: IUseAtomUpdateScheduleOptions = {
    onSuccess: () => {
      return;
    },
    onError: () => {
      return;
    },
  }
) => {
  const queryClient = useQueryClient();

  return useMutation<
    ApiResponse<UpdateScheduleResponse>,
    unknown,
    { scheduleId: number; body: UpdateAtomScheduleDto }
  >({
    mutationFn: async ({ scheduleId, body }: { scheduleId: number; body: UpdateAtomScheduleDto }) => {
      const url = `atoms/schedules/${scheduleId}`;
      const response = await http.patch<ApiResponse<UpdateScheduleResponse>>(url, body);
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
