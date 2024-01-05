import { useMutation } from "@tanstack/react-query";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import type { ApiResponse, DeleteScheduleInput } from "@calcom/platform-types";

interface IPDeleteOAuthClient {
  onSuccess?: () => void;
  onError?: () => void;
}

const useDeleteSchedule = (
  { onSuccess, onError }: IPDeleteOAuthClient = {
    onSuccess: () => {
      return;
    },
    onError: () => {
      return;
    },
  }
) => {
  const mutation = useMutation<ApiResponse<undefined>, unknown, DeleteScheduleInput>({
    mutationFn: (data) => {
      const { id, key } = data;
      return fetch(`/api/v2/schedules/${id}?apiKey=${key}`, {
        method: "delete",
        headers: { "Content-type": "application/json" },
      }).then((res) => res.json());
    },
    onSuccess: (data) => {
      if (data.status === SUCCESS_STATUS) {
        onSuccess?.();
      } else {
        onError?.();
      }
    },
    onError: () => {
      onError?.();
    },
  });

  return mutation;
};

export default useDeleteSchedule;
