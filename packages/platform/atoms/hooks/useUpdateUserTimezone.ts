import { useMutation } from "@tanstack/react-query";

import { V2_ENDPOINTS } from "@calcom/platform-constants";
import { SUCCESS_STATUS } from "@calcom/platform-constants";
import type { ApiResponse, UserResponse } from "@calcom/platform-types";

import http from "../lib/http";

type updateTimezoneInput = {
  timeZone: string;
};

export const useUpdateUserTimezone = () => {
  const pathname = `/${V2_ENDPOINTS.me}`;

  const mutation = useMutation<ApiResponse<UserResponse>, unknown, updateTimezoneInput>({
    mutationFn: (data) => {
      const { timeZone } = data;

      return http?.patch(pathname, { timeZone }).then((res) => {
        if (res.data.status === SUCCESS_STATUS) {
          return res.data;
        }
        throw new Error(res.data.error.message);
      });
    },
  });

  return mutation;
};
