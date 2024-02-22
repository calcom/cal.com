import { useMutation } from "@tanstack/react-query";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import { BASE_URL, API_VERSION, V2_ENDPOINTS } from "@calcom/platform-constants";
import type { ApiResponse, ScheduleResponse } from "@calcom/platform-types";

import http from "../../lib/http";
import type { AvailabilityFormValues } from "../types";

interface IPUpdateOAuthClient {
  onSuccess?: () => void;
  onError?: () => void;
}

type UpdateScheduleInput = {
  id: number;
} & AvailabilityFormValues;
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
  const endpoint = new URL(BASE_URL);

  const mutation = useMutation<ApiResponse<ScheduleResponse>, unknown, UpdateScheduleInput>({
    mutationFn: (data) => {
      const { id, ...rest } = data;
      endpoint.pathname = `api/${API_VERSION}/${V2_ENDPOINTS.availability}/${id}`;
      endpoint.searchParams.set("for", "atom");

      // user data needs to be sent back in body
      return http?.patch<ApiResponse<ScheduleResponse>>(endpoint.toString(), rest).then((res) => {
        return res?.data;
      });
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

export default useUpdateSchedule;
