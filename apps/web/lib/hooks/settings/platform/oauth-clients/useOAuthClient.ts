import { useQuery } from "@tanstack/react-query";

import type { ApiSuccessResponse, PlatformOAuthClientDto } from "@calcom/platform-types";

export const useOAuthClient = (clientId?: string) => {
  const {
    isLoading,
    error,
    data: response,
    isFetched,
    isError,
    isFetching,
    isSuccess,
    isFetchedAfterMount,
    refetch,
  } = useQuery<ApiSuccessResponse<PlatformOAuthClientDto>>({
    queryKey: ["oauth-client", clientId],
    queryFn: () => {
      return fetch(`/api/v2/oauth-clients/${clientId}`, {
        method: "get",
        headers: { "Content-type": "application/json" },
      }).then((res) => res.json());
    },
    enabled: Boolean(clientId),
    staleTime: Infinity,
  });

  return {
    isLoading,
    error,
    data: response?.data,
    isFetched,
    isError,
    isFetching,
    isSuccess,
    isFetchedAfterMount,
    refetch,
  };
};
