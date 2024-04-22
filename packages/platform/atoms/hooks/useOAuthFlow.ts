import type { AxiosError, AxiosRequestConfig } from "axios";
// eslint-disable-next-line no-restricted-imports
import { debounce } from "lodash";
import { useEffect, useState } from "react";
import usePrevious from "react-use/lib/usePrevious";

import type { ApiResponse } from "@calcom/platform-types";

import http from "../lib/http";

export interface useOAuthProps {
  accessToken?: string;
  refreshUrl?: string;
  onError?: (error: string) => void;
  onSuccess?: () => void;
  clientId: string;
}

const debouncedRefresh = debounce(http.refreshTokens, 10000, { leading: true, trailing: false });
export const useOAuthFlow = ({ accessToken, refreshUrl, clientId, onError, onSuccess }: useOAuthProps) => {
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [clientAccessToken, setClientAccessToken] = useState<string>("");
  const prevAccessToken = usePrevious(accessToken);
  useEffect(() => {
    const interceptorId =
      clientAccessToken && http.getAuthorizationHeader()
        ? http.responseInterceptor.use(undefined, async (err: AxiosError) => {
            const originalRequest = err.config as AxiosRequestConfig;
            if (refreshUrl && err.response?.status === 498 && !isRefreshing) {
              setIsRefreshing(true);
              const refreshedToken = await debouncedRefresh(refreshUrl);
              if (refreshedToken) {
                setClientAccessToken(refreshedToken);
                onSuccess?.();
                return http.instance({
                  ...originalRequest,
                  headers: { ...originalRequest.headers, Authorization: `Bearer ${refreshedToken}` },
                });
              } else {
                onError?.("Invalid Refresh Token.");
              }

              setIsRefreshing(false);
            }
            return Promise.reject(err.response);
          })
        : "";

    return () => {
      if (interceptorId) {
        http.responseInterceptor.eject(interceptorId);
      }
    };
  }, [clientAccessToken, isRefreshing, refreshUrl, onError, onSuccess]);

  useEffect(() => {
    if (accessToken && http.getUrl() && prevAccessToken !== accessToken) {
      http.setAuthorizationHeader(accessToken);
      try {
        http
          .get<ApiResponse>(`/provider/${clientId}/access-token`)
          .catch(async (err: AxiosError) => {
            if ((err.response?.status === 498 || err.response?.status === 401) && refreshUrl) {
              setIsRefreshing(true);
              const refreshedToken = await http.refreshTokens(refreshUrl);
              if (refreshedToken) {
                setClientAccessToken(refreshedToken);
                onSuccess?.();
              } else {
                onError?.("Invalid Refresh Token.");
              }
              setIsRefreshing(false);
            }
          })
          .finally(() => {
            setClientAccessToken(accessToken);
          });
      } catch (err) {}
    }
  }, [accessToken, clientId, refreshUrl, prevAccessToken, onError, onSuccess]);

  return { isRefreshing, currentAccessToken: clientAccessToken };
};
