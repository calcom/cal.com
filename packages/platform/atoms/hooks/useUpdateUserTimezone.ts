import { useMutation } from "@tanstack/react-query";

import { BASE_URL, API_VERSION, V2_ENDPOINTS } from "@calcom/platform-constants";
import type { ApiResponse } from "@calcom/platform-types";

import { useAtomsContext } from "./useAtomsContext";

type updateTimezoneInput = {
  timeZone: string;
};

export const useUpdateUserTimezone = () => {
  const endpoint = new URL(BASE_URL);

  endpoint.pathname = `${API_VERSION}/${V2_ENDPOINTS.me}`;
  const { accessToken } = useAtomsContext();

  const mutation = useMutation<ApiResponse<undefined>, unknown, updateTimezoneInput>({
    mutationFn: (data) => {
      const { timeZone } = data;

      return fetch(endpoint.toString(), {
        method: "patch",
        headers: { "Content-type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ timeZone }),
      }).then((res) => res.json());
    },
  });

  return mutation;
};
