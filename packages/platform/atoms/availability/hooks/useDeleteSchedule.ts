import { useMutation } from "@tanstack/react-query";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import { BASE_URL, API_VERSION, V2_ENDPOINTS } from "@calcom/platform-constants";
import type { ApiResponse } from "@calcom/platform-types";

import http from "../../lib/http";

interface IPDeleteOAuthClient {
  onSuccess?: () => void;
  onError?: () => void;
}

type DeleteScheduleInput = {
  id: string;
};

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
  const endpoint = new URL(BASE_URL);

  const mutation = useMutation<ApiResponse<undefined>, unknown, DeleteScheduleInput>({
    mutationFn: (data) => {
      const { id } = data;
      endpoint.pathname = `api/${API_VERSION}/${V2_ENDPOINTS.availability}/${id}`;
      endpoint.searchParams.set("for", "atom");

      return http?.delete(endpoint.toString()).then((res) => res.data);
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
