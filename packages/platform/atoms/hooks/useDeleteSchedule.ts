import { useMutation, useQueryClient } from "@tanstack/react-query";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import { BASE_URL, API_VERSION, V2_ENDPOINTS } from "@calcom/platform-constants";
import type { ApiResponse, ApiErrorResponse } from "@calcom/platform-types";

import http from "../lib/http";
import { QUERY_KEY } from "./useClientSchedule";

interface IUseDeleteScheduleProps {
  onSuccess?: (res: ApiResponse) => void;
  onError?: (err: ApiErrorResponse) => void;
}

type DeleteScheduleInput = {
  id: number;
};

const useDeleteSchedule = (
  { onSuccess, onError }: IUseDeleteScheduleProps = {
    onSuccess: () => {
      return;
    },
    onError: () => {
      return;
    },
  }
) => {
  const endpoint = new URL(BASE_URL);
  const queryClient = useQueryClient();

  const mutation = useMutation<ApiResponse<undefined>, unknown, DeleteScheduleInput>({
    mutationFn: (data) => {
      const { id } = data;
      endpoint.pathname = `api/${API_VERSION}/${V2_ENDPOINTS.availability}/${id}`;
      endpoint.searchParams.set("for", "atom");

      return http?.delete(endpoint.toString()).then((res) => res.data);
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

  return mutation;
};

export default useDeleteSchedule;
