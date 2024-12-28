import { useQuery } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";

import {
  SUCCESS_STATUS,
  ERROR_STATUS,
  ZOOM,
  GOOGLE_MEET,
  OFFICE_365_VIDEO,
} from "@calcom/platform-constants";
import type { ApiErrorResponse, ApiResponse } from "@calcom/platform-types";
import type { App } from "@calcom/types/App";

import http from "../../../lib/http";

export type UseGetOauthAuthUrlProps = {
  returnTo?: string;
  onErrorReturnTo?: string;
};

export const useGetZoomOauthAuthUrl = ({ returnTo, onErrorReturnTo }: UseGetOauthAuthUrlProps) => {
  return useQuery({
    queryKey: ["get-zoom-auth-url"],
    staleTime: Infinity,
    enabled: false,
    queryFn: () => {
      return http
        ?.get<ApiResponse<{ url: string }>>(
          `conferencing/${ZOOM}/oauth/auth-url${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ""}${
            onErrorReturnTo ? `&onErrorReturnTo=${encodeURIComponent(onErrorReturnTo)}` : ""
          }`
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
};

export const useOffice365GetOauthAuthUrl = ({ returnTo, onErrorReturnTo }: UseGetOauthAuthUrlProps) => {
  return useQuery({
    queryKey: ["get-office365-auth-url"],
    staleTime: Infinity,
    enabled: false,
    queryFn: () => {
      return http
        ?.get<ApiResponse<{ url: string }>>(
          `conferencing/${OFFICE_365_VIDEO}/oauth/auth-url${
            returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ""
          }${onErrorReturnTo ? `&onErrorReturnTo=${encodeURIComponent(onErrorReturnTo)}` : ""}`
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
};

export type UseConnectGoogleMeetProps = {
  onSuccess?: (res: ApiResponse) => void;
  onError?: (err: ApiErrorResponse) => void;
  returnTo?: string;
  onErrorReturnTo?: string;
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

export const useConnect = ({ returnTo, onErrorReturnTo, ...props }: UseConnectGoogleMeetProps) => {
  const { refetch: refetchZoomAuthUrl } = useGetZoomOauthAuthUrl({ returnTo, onErrorReturnTo });
  const { refetch: refetchOffice365AuthUrl } = useOffice365GetOauthAuthUrl({ returnTo, onErrorReturnTo });
  const connectNonOauthApp = useConnectNonOauthApp(props);

  const connect = async (app: App["slug"]) => {
    switch (app) {
      case ZOOM:
        const zoomRedirectUri = await refetchZoomAuthUrl();
        if (zoomRedirectUri.data) {
          window.location.href = zoomRedirectUri.data;
        }
        break;

      case OFFICE_365_VIDEO:
        const office365RedirectUri = await refetchOffice365AuthUrl();
        if (office365RedirectUri.data) {
          window.location.href = office365RedirectUri.data;
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
