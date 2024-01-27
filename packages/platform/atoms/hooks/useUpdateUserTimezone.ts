import { useMutation } from "@tanstack/react-query";

import { BASE_URL, API_VERSION, ENDPOINTS } from "@calcom/platform-constants";
import type { ApiResponse } from "@calcom/platform-types";

import { useApiKey } from "../hooks/useApiKeys";

type updateTimezoneInput = {
  timeZone: string;
};

export const useUpdateUserTimezone = () => {
  const { key } = useApiKey();
  const endpoint = new URL(BASE_URL);

  endpoint.pathname = `${API_VERSION}/${ENDPOINTS.me}`;
  endpoint.searchParams.set("apiKey", key);

  const mutation = useMutation<ApiResponse<undefined>, unknown, updateTimezoneInput>({
    mutationFn: (data) => {
      const { timeZone } = data;

      return fetch(endpoint.toString(), {
        method: "patch",
        headers: { "Content-type": "application/json" },
        body: JSON.stringify({ timeZone }),
      }).then((res) => res.json());
    },
  });

  return mutation;
};
