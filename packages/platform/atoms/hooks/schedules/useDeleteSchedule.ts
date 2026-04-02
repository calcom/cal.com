import { SUCCESS_STATUS, V2_ENDPOINTS } from "@calcom/platform-constants";
import type { ApiErrorResponse, ApiResponse } from "@calcom/platform-types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import http from "../../lib/http";
import { QUERY_KEY } from "./useAtomSchedule";

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
  const queryClient = useQueryClient();

  const mutation = useMutation<ApiResponse<undefined>, unknown, DeleteScheduleInput>({
    mutationFn: (data) => {
      const { id } = data;
      const pathname = `/${V2_ENDPOINTS.availability}/${id}`;

      return http?.delete(pathname).then((res) => res.data);
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
