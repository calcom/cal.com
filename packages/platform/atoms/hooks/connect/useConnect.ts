import { useQuery, useMutation } from "@tanstack/react-query";

import type { CALENDARS } from "@calcom/platform-constants";
import { SUCCESS_STATUS, ERROR_STATUS } from "@calcom/platform-constants";
import type { ApiResponse, ApiErrorResponse } from "@calcom/platform-types";

import http from "../../lib/http";

export const getQueryKey = (calendar: (typeof CALENDARS)[number]) => [`get-${calendar}-redirect-uri`];

interface IPUpdateOAuthCredentials {
  onSuccess?: (res: ApiResponse) => void;
  onError?: (err: ApiErrorResponse) => void;
}

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

export const useSaveCalendarCredentials = (
  { onSuccess, onError }: IPUpdateOAuthCredentials = {
    onSuccess: () => {
      return;
    },
    onError: () => {
      return;
    },
  }
) => {
  const mutation = useMutation<
    ApiResponse<{ status: string }>,
    unknown,
    { username: string; password: string; calendar: (typeof CALENDARS)[number] }
  >({
    mutationFn: (data) => {
      const { calendar, username, password } = data;
      const body = {
        username,
        password,
      };

      return http.post(`/calendars/${calendar}/credentials`, body).then((res) => {
        return res.data;
      });
    },
    onSuccess: (data) => {
      if (data.status === SUCCESS_STATUS) {
        onSuccess?.(data);
      } else {
        onError?.(data);
      }
    },
    onError: (err) => {
      onError?.(err as ApiErrorResponse);
    },
  });

  return mutation;
};
