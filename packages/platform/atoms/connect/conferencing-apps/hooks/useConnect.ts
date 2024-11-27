import { useQuery } from "@tanstack/react-query";

import { SUCCESS_STATUS, ERROR_STATUS } from "@calcom/platform-constants";
import type { ApiResponse } from "@calcom/platform-types";

import http from "../../../lib/http";

export const useGetAuthUrl = (teamId?: number | null) => {
  const authUrl = useQuery({
    queryKey: ["get-zoom-auth-url"],
    staleTime: Infinity,
    enabled: false,
    queryFn: () => {
      return http
        ?.get<ApiResponse<{ url: string }>>(
          `conferencing/zoom/oauth/auth-url${teamId ? `&teamId=${teamId}` : ""}`
        )
        .then(({ data: responseBody }) => {
          if (responseBody.status === SUCCESS_STATUS) {
            return responseBody.data.url;
          }
          if (responseBody.status === ERROR_STATUS) throw new Error(responseBody.error.message);
          return "";
        });
    },
  });

  return authUrl;
};

export const useConnect = (teamId?: number | null) => {
  const { refetch } = useGetAuthUrl(teamId);

  const connect = async () => {
    const redirectUri = await refetch();

    if (redirectUri.data) {
      window.location.href = redirectUri.data;
    }
  };

  return { connect };
};
