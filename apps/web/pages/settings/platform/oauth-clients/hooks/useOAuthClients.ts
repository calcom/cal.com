import { useQuery } from "@tanstack/react-query";

import type { ApiSuccessResponse } from "@calcom/platform-types";
import type { PlatformOAuthClient } from "@calcom/prisma/client";

// hook to fetch oauth clients data
// react-query to fetch
// {loading, fetching, data} = useQuery to fetch data with react-query

export const useOAuthClients = () => {
  const {
    isLoading,
    error,
    data: response,
  } = useQuery<ApiSuccessResponse<PlatformOAuthClient[]>>({
    queryKey: ["oauth-clients"],
    queryFn: () => {
      return fetch("/api/v2/oauth-clients", {
        method: "get",
        headers: { "Content-type": "application/json" },
      }).then((res) => res.json());
    },
  });

  return { isLoading, error, data: response?.data };
};

export const useOAuthClient = (clientId: string) => {
  const {
    isLoading,
    error,
    data: response,
  } = useQuery<ApiSuccessResponse<PlatformOAuthClient>>({
    queryKey: ["oauth-client"],
    queryFn: () => {
      return fetch(`/api/v2/oauth-clients/${clientId}`, {
        method: "get",
        headers: { "Content-type": "application/json" },
      }).then((res) => res.json());
    },
  });

  return { isLoading, error, data: response?.data };
};
