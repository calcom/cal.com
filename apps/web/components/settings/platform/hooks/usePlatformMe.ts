import { useQuery } from "@tanstack/react-query";

import type { UserResponse } from "@calcom/platform-types";

export const usePlatformMe = () => {
  const QUERY_KEY = "get-platform-me";
  const platformMeQuery = useQuery<UserResponse>({
    queryKey: [QUERY_KEY],
    queryFn: async (): Promise<UserResponse> => {
      const response = await fetch(`/api/v2/me`, {
        method: "get",
        headers: { "Content-type": "application/json" },
      });
      const data = await response.json();

      return data.data as UserResponse;
    },
  });

  return platformMeQuery;
};
