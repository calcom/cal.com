import { useQuery } from "@tanstack/react-query";

import type { UserResponse } from "@calcom/platform-types";

export const usePlatformMe = () => {
  const QUERY_KEY = "get-platform-me";
  const platformMeQuery = useQuery<UserResponse>({
    queryKey: [QUERY_KEY],
    staleTime: 300000,
    retry: (failureCount, error) => {
      if (error.message === "500") {
        return false;
      }
      return failureCount < 3; // Retry up to 3 times for other errors
    },
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
