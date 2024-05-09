import { useQuery } from "@tanstack/react-query";

import type { ApiSuccessResponse } from "@calcom/platform-types";
import type { PlatformOAuthClient } from "@calcom/prisma/client";

export type ManagedUser = {
  id: number;
  email: string;
  username: string | null;
  timeZone: string;
  weekStart: string;
  createdDate: Date;
  timeFormat: number | null;
  defaultScheduleId: number | null;
};

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
  } = useQuery<ApiSuccessResponse<PlatformOAuthClient>>({
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
export const useGetOAuthClientManagedUsers = (clientId: string) => {
  const {
    isLoading,
    error,
    data: response,
    refetch,
  } = useQuery<ApiSuccessResponse<ManagedUser[]>>({
    queryKey: ["oauth-client-managed-users", clientId],
    queryFn: () => {
      return fetch(`/api/v2/oauth-clients/${clientId}/managed-users`, {
        method: "get",
        headers: { "Content-type": "application/json" },
      }).then((res) => res.json());
    },
  });

  return { isLoading, error, data: response?.data, refetch };
};
