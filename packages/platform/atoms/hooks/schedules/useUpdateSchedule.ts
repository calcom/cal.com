import { useMutation, useQueryClient } from "@tanstack/react-query";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import { V2_ENDPOINTS } from "@calcom/platform-constants";
import type { ApiResponse, UpdateScheduleInput_2024_06_11, ApiErrorResponse } from "@calcom/platform-types";
import type { ScheduleOutput_2024_06_11 } from "@calcom/platform-types";

import http from "../../lib/http";
import { QUERY_KEY as ScheduleQueryKey } from "./useSchedule";

interface IPUpdateOAuthClient {
  onSuccess?: (res: ApiResponse<ScheduleOutput_2024_06_11>) => void;
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
    ApiResponse<ScheduleOutput_2024_06_11>,
    unknown,
    UpdateScheduleInput_2024_06_11 & { id: number }
  >({
    mutationFn: (data) => {
      const pathname = `/${V2_ENDPOINTS.availability}/${data.id}`;

      return http.patch<ApiResponse<ScheduleOutput_2024_06_11>>(pathname, data).then((res) => {
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
