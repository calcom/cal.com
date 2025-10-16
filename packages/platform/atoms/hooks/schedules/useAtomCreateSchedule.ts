import { useMutation, useQueryClient } from "@tanstack/react-query";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import type { ApiResponse, ApiErrorResponse, ApiSuccessResponse } from "@calcom/platform-types";
import type { CreateScheduleHandlerReturn } from "@calcom/trpc/server/routers/viewer/availability/schedule/create.handler";
import { TCreateInputSchema as CreateScheduleSchema } from "@calcom/trpc/server/routers/viewer/availability/schedule/create.schema";

import http from "../../lib/http";
import { QUERY_KEY as SchedulesQueryKey } from "./useAtomGetAllSchedules";
import { QUERY_KEY as ScheduleQueryKey } from "./useAtomSchedule";

interface useAtomCreateScheduleOptions {
  onSuccess?: (res: ApiSuccessResponse<CreateScheduleHandlerReturn>) => void;
  onError?: (err: ApiErrorResponse) => void;
}

export const useAtomCreateSchedule = (
  { onSuccess, onError }: useAtomCreateScheduleOptions = {
    onSuccess: () => {
      return;
    },
    onError: () => {
      return;
    },
  }
) => {
  const queryClient = useQueryClient();

  return useMutation<ApiResponse<CreateScheduleHandlerReturn>, unknown, CreateScheduleSchema>({
    mutationFn: async (body: CreateScheduleSchema) => {
      const url = `atoms/schedules/create`;
      const response = await http.post<ApiResponse<CreateScheduleHandlerReturn>>(url, body);
      return response.data;
    },
    onSuccess: (data) => {
      if (data.status === SUCCESS_STATUS) {
        onSuccess?.(data);
        queryClient.invalidateQueries({ queryKey: [ScheduleQueryKey] });
        queryClient.invalidateQueries({ queryKey: [SchedulesQueryKey] });
      } else {
        onError?.(data);
      }
    },
    onError: (err) => {
      onError?.(err as ApiErrorResponse);
    },
  });
};
