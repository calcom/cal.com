import { useQuery } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";

import { SUCCESS_STATUS, ERROR_STATUS, ZOOM, GOOGLE_MEET } from "@calcom/platform-constants";
import type { ApiErrorResponse, ApiResponse } from "@calcom/platform-types";
import type { App } from "@calcom/types/App";

import http from "../../../lib/http";

export const useGetOauthAuthUrl = () => {
  return useQuery({
    queryKey: ["get-zoom-auth-url"],
    staleTime: Infinity,
    enabled: false,
    queryFn: () => {
      return http
        ?.get<ApiResponse<{ url: string }>>(`conferencing/${ZOOM}/oauth/auth-url`)
        .then(({ data: responseBody }) => {
          if (responseBody.status === SUCCESS_STATUS) {
            return responseBody.data.url;
          }
          if (responseBody.status === ERROR_STATUS) throw new Error(responseBody.error.message);
          return "";
        });
    },
  });
};

export type UseConnectGoogleMeetProps = {
  onSuccess?: (res: ApiResponse) => void;
  onError?: (err: ApiErrorResponse) => void;
};

export const useConnectNonOauthApp = (
  { onSuccess, onError }: UseConnectGoogleMeetProps = {
    onSuccess: () => {
      return;
    },
    onError: () => {
      return;
    },
  }
) => {
  return useMutation({
    mutationFn: (app: string) => {
      const pathname = `/conferencing/${app}/connect`;
      return http?.post(pathname).then((res) => {
        if (res.data.status === SUCCESS_STATUS) {
          return { status: res.data };
        } else {
          throw new Error(res.data.error.message);
        }
      });
    },
    onSuccess,
    onError,
  });
};

export const useConnect = (props: UseConnectGoogleMeetProps) => {
  const { refetch } = useGetOauthAuthUrl();
  const connectNonOauthApp = useConnectNonOauthApp(props);

  const connect = async (app: App["slug"]) => {
    switch (app) {
      case ZOOM:
        const redirectUri = await refetch();
        if (redirectUri.data) {
          window.location.href = redirectUri.data;
        }
        break;

      case GOOGLE_MEET:
        connectNonOauthApp.mutate(app);

      default:
        break;
    }
  };

  return { connect };
};
