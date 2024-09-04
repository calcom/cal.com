import { useQuery } from "@tanstack/react-query";

import type { UserResponse } from "@calcom/platform-types";

export const usePlatformMe = () => {
  const QUERY_KEY = "get-platform-me";
  const platformMeQuery = useQuery<UserResponse>({
    queryKey: [QUERY_KEY],
    staleTime: 300000,
    queryFn: async () => {
      const response = await fetch(`/api/v2/me`, {
        method: "get",
        headers: { "Content-type": "application/json" },
      });

      if (response.status === 200) {
        const data = await response.json();
        return data.data as UserResponse;
      }

      throw new Error(response.status.toString());
    },
  });

  return platformMeQuery;
};
