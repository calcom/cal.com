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

import { useAtomsContext } from "../../../hooks/useAtomsContext";
import http from "../../../lib/http";

export type UseGetOauthAuthUrlProps = {
  returnTo?: string;
  onErrorReturnTo?: string;
  teamId?: number;
};

export const useGetZoomOauthAuthUrl = ({ returnTo, onErrorReturnTo, teamId }: UseGetOauthAuthUrlProps) => {
  const { organizationId } = useAtomsContext();
  let pathname = `conferencing/${ZOOM}/oauth/auth-url`;

  if (teamId) {
    pathname = `organizations/${organizationId}/teams/${teamId}/conferencing/${ZOOM}/oauth/auth-url`;
  }

  const queryParams = new URLSearchParams();
  if (returnTo) queryParams.append("returnTo", returnTo);
  if (onErrorReturnTo) queryParams.append("onErrorReturnTo", onErrorReturnTo);

  const fullPath = queryParams.toString() ? `${pathname}?${queryParams.toString()}` : pathname;

  return useQuery({
    queryKey: ["get-zoom-auth-url", teamId, organizationId],
    staleTime: Infinity,
    enabled: false,
    queryFn: () => {
      return http?.get<ApiResponse<{ url: string }>>(fullPath).then(({ data: responseBody }) => {
        if (responseBody.status === SUCCESS_STATUS) {
          return responseBody.data.url;
        }
        if (responseBody.status === ERROR_STATUS) throw new Error(responseBody.error.message);
        return "";
      });
    },
  });
};

export const useOffice365GetOauthAuthUrl = ({
  returnTo,
  onErrorReturnTo,
  teamId,
}: UseGetOauthAuthUrlProps) => {
  const { organizationId } = useAtomsContext();
  let pathname = `conferencing/${OFFICE_365_VIDEO}/oauth/auth-url`;

  if (teamId) {
    pathname = `organizations/${organizationId}/teams/${teamId}/conferencing/${OFFICE_365_VIDEO}/oauth/auth-url`;
  }

  // Add query parameters
  const queryParams = new URLSearchParams();
  if (returnTo) queryParams.append("returnTo", returnTo);
  if (onErrorReturnTo) queryParams.append("onErrorReturnTo", onErrorReturnTo);

  const fullPath = queryParams.toString() ? `${pathname}?${queryParams.toString()}` : pathname;

  return useQuery({
    queryKey: ["get-office365-auth-url", teamId, organizationId],
    staleTime: Infinity,
    enabled: false,
    queryFn: () => {
      return http?.get<ApiResponse<{ url: string }>>(fullPath).then(({ data: responseBody }) => {
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
  teamId?: number;
};

export const useConnectNonOauthApp = (
  { onSuccess, onError, teamId, returnTo, onErrorReturnTo }: UseConnectGoogleMeetProps = {
    onSuccess: () => {
      return;
    },
    onError: () => {
      return;
    },
  }
) => {
  const { organizationId } = useAtomsContext();
  return useMutation({
    mutationFn: (app: string) => {
      let pathname = `/conferencing/${app}/connect`;

      if (teamId) {
        pathname = `/organizations/${organizationId}/teams/${teamId}/conferencing/${app}/connect`;
      }

      const queryParams = new URLSearchParams();
      if (returnTo) queryParams.append("returnTo", returnTo);
      if (onErrorReturnTo) queryParams.append("onErrorReturnTo", onErrorReturnTo);

      const fullPath = queryParams.toString() ? `${pathname}?${queryParams.toString()}` : pathname;
      return http?.post(fullPath).then((res) => {
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
  const { refetch: refetchZoomAuthUrl } = useGetZoomOauthAuthUrl(props);
  const { refetch: refetchOffice365AuthUrl } = useOffice365GetOauthAuthUrl(props);
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
