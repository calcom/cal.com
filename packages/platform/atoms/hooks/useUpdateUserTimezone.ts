import { useMutation } from "@tanstack/react-query";

import type { ApiResponse } from "@calcom/platform-types";

type updateTimezoneInput = {
  timeZone: string;
  key: string;
};

export const useUpdateUserTimezone = () => {
  const mutation = useMutation<ApiResponse<undefined>, unknown, updateTimezoneInput>({
    mutationFn: (data) => {
      const { key, timeZone } = data;

      return fetch(`/api/v2/me?apiKey=${key}`, {
        method: "patch",
        headers: { "Content-type": "application/json" },
        body: JSON.stringify({ timeZone }),
      }).then((res) => res.json());
    },
  });

  return mutation;
};
