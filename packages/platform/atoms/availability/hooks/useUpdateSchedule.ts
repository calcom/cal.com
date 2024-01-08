import { useMutation } from "@tanstack/react-query";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import type { ApiResponse } from "@calcom/platform-types";

interface IPUpdateOAuthClient {
  onSuccess?: () => void;
  onError?: () => void;
}

interface UpdateScheduleInput {
  id: string;
  key: string;
  body: any;
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
  const mutation = useMutation<ApiResponse<undefined>, unknown, UpdateScheduleInput>({
    mutationFn: (data) => {
      const { id, key, body } = data;
      return fetch(`/api/v2/schedules/${id}?apiKey=${key}`, {
        method: "patch",
        headers: { "Content-type": "application/json", body },
      }).then((res) => res.json());
    },
    onSuccess: (data) => {
      if (data.status === SUCCESS_STATUS) {
        onSuccess?.();
      }
    },
    onError: () => {
      onError?.();
    },
  });

  return mutation;
};

export default useUpdateSchedule;
