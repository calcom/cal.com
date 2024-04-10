import { useMutation, useQueryClient } from "@tanstack/react-query";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import { V2_ENDPOINTS } from "@calcom/platform-constants";
import type { UpdateScheduleOutputType } from "@calcom/platform-libraries";
import type { ApiResponse, UpdateScheduleInput, ApiErrorResponse } from "@calcom/platform-types";

import http from "../lib/http";
import { QUERY_KEY as ScheduleQueryKey } from "./useClientSchedule";

interface IPUpdateOAuthClient {
  onSuccess?: (res: ApiResponse<UpdateScheduleOutputType>) => void;
  onError?: (err: ApiErrorResponse) => void;
}

const useUpdateSchedule = (
  { onSuccess, onError }: IPUpdateOAuthClient = {
    onSuccess: () => {
      return;
    },
    onError: () => {
      return;
    },
  }
) => {
  const queryClient = useQueryClient();

  const mutation = useMutation<
    ApiResponse<UpdateScheduleOutputType>,
    unknown,
    UpdateScheduleInput & { scheduleId: number }
  >({
    mutationFn: (data) => {
      const pathname = `/${V2_ENDPOINTS.availability}/${data.scheduleId}?for=atom`;

      return http.patch<ApiResponse<UpdateScheduleOutputType>>(pathname, data).then((res) => {
        return res.data;
      });
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

  return mutation;
};

export default useUpdateSchedule;
