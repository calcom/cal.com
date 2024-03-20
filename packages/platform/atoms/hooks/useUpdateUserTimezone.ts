import { useMutation } from "@tanstack/react-query";

import { BASE_URL, API_VERSION, V2_ENDPOINTS } from "@calcom/platform-constants";
import { SUCCESS_STATUS } from "@calcom/platform-constants";
import type { ApiResponse, UserResponse } from "@calcom/platform-types";

import http from "../lib/http";

type updateTimezoneInput = {
  timeZone: string;
};

export const useUpdateUserTimezone = () => {
  const endpoint = new URL(BASE_URL);

  endpoint.pathname = `api/${API_VERSION}/${V2_ENDPOINTS.me}`;

  const mutation = useMutation<ApiResponse<UserResponse>, unknown, updateTimezoneInput>({
    mutationFn: (data) => {
      const { timeZone } = data;

      return http?.patch(endpoint.toString(), { timeZone }).then((res) => {
        if (res.data.status === SUCCESS_STATUS) {
          return res.data;
        }
        throw new Error(res.data.error.message);
      });
    },
  });

  return mutation;
};
