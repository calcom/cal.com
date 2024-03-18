import { useQuery } from "@tanstack/react-query";

import type { ApiSuccessResponse } from "@calcom/platform-types";
import type { PlatformOAuthClient } from "@calcom/prisma/client";

export const useOAuthClients = () => {
  const query = useQuery<ApiSuccessResponse<PlatformOAuthClient[]>>({
    queryKey: ["oauth-clients"],
    queryFn: () => {
      return fetch("/api/v2/oauth-clients", {
        method: "get",
        headers: { "Content-type": "application/json" },
      }).then((res) => res.json());
    },
  });

  return { ...query, data: query.data?.data ?? [] };
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
