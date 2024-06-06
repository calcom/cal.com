import { useQuery } from "@tanstack/react-query";

import type { CALENDARS } from "@calcom/platform-constants";
import { SUCCESS_STATUS, ERROR_STATUS } from "@calcom/platform-constants";
import type { ApiResponse } from "@calcom/platform-types";

import http from "../../lib/http";

export const getQueryKey = (calendar: (typeof CALENDARS)[number]) => [`get-${calendar}-redirect-uri`];

export const useGetRedirectUrl = (calendar: (typeof CALENDARS)[number], redir?: string) => {
  const authUrl = useQuery({
    queryKey: getQueryKey(calendar),
    staleTime: Infinity,
    enabled: false,
    queryFn: () => {
      return http
        ?.get<ApiResponse<{ authUrl: string }>>(
          `/calendars/${calendar}/connect${redir ? `?redir=${redir}` : ""}`
        )
        .then(({ data: responseBody }) => {
          if (responseBody.status === SUCCESS_STATUS) {
            return responseBody.data.authUrl;
          }
          if (responseBody.status === ERROR_STATUS) throw new Error(responseBody.error.message);
          return "";
        });
    },
  });

  return authUrl;
};

export const useConnect = (calendar: (typeof CALENDARS)[number], redir?: string) => {
  const { refetch } = useGetRedirectUrl(calendar, redir);

  const connect = async () => {
    const redirectUri = await refetch();

    if (redirectUri.data) {
      window.location.href = redirectUri.data;
    }
  };

  return { connect };
};
