import { useQuery } from "@tanstack/react-query";

import { OFFICE_365_CALENDAR, SUCCESS_STATUS, ERROR_STATUS } from "@calcom/platform-constants";
import type { ApiResponse } from "@calcom/platform-types";

import http from "../../../lib/http";

export const QUERY_KEY = ["get-office-365-redirect-uri"];

export const useGetRedirectUrl = () => {
  const authUrl = useQuery({
    queryKey: QUERY_KEY,
    staleTime: Infinity,
    enabled: false,
    queryFn: () => {
      return http
        ?.get<ApiResponse<{ authUrl: string }>>(`/calendars/${OFFICE_365_CALENDAR}/connect`)
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

export const useConnect = () => {
  const { refetch } = useGetRedirectUrl();

  const connect = async () => {
    const redirectUri = await refetch();

    if (redirectUri.data) {
      window.location.href = redirectUri.data;
    }
  };

  return { connect };
};
