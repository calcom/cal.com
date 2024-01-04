import type { AxiosError, AxiosRequestConfig } from "axios";
import { useEffect, useState } from "react";
import usePrevious from "react-use/lib/usePrevious";

import type { ApiResponse } from "@calcom/platform-types";

import http from "../lib/http";

export interface useOAuthProps {
  accessToken?: string;
  refreshUrl?: string;
  onError?: (error: string) => void;
  clientId: string;
}
export const useOAuthFlow = ({ accessToken, refreshUrl, clientId, onError }: useOAuthProps) => {
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [clientAccessToken, setClientAccessToken] = useState<string>("");
  const prevAccessToken = usePrevious(accessToken);

  useEffect(() => {
    const interceptorId =
      clientAccessToken && http.getAuthorizationHeader()
        ? http.responseInterceptor.use(undefined, async (err: AxiosError) => {
            const originalRequest = err.config as AxiosRequestConfig & { _retry?: boolean };
            if (refreshUrl && err.response?.status === 498 && !isRefreshing) {
              setIsRefreshing(true);
              originalRequest._retry = true;
              const refreshedToken = await http.refreshTokens(refreshUrl);

              if (refreshedToken) setClientAccessToken(refreshedToken);
              else onError?.("Invalid Refresh Token.");

              setIsRefreshing(false);

              if (!originalRequest._retry) {
                return http.instance(originalRequest);
              }
            }
          })
        : "";

    return () => {
      if (interceptorId) {
        http.responseInterceptor.eject(interceptorId);
      }
    };
  }, [clientAccessToken, isRefreshing, refreshUrl, onError]);

  useEffect(() => {
    if (accessToken && http.getUrl() && prevAccessToken !== accessToken) {
      http.setAuthorizationHeader(accessToken);
      try {
        http
          .get<ApiResponse>(`/atoms/cal-provider/${clientId}/access-token`)
          .catch(async (err: AxiosError) => {
            if (err.response?.status === 401) onError?.("Invalid Access Token.");

            if (err.response?.status === 498 && refreshUrl) {
              setIsRefreshing(true);
              const refreshedToken = await http.refreshTokens(refreshUrl);
              if (refreshedToken) setClientAccessToken(refreshedToken);
              else onError?.("Invalid Refresh Token.");
              setIsRefreshing(false);
            }
          })
          .finally(() => {
            setClientAccessToken(accessToken);
          });
      } catch (err) {}
    }
  }, [accessToken, clientId, refreshUrl, prevAccessToken, onError]);

  return { isRefreshing, currentAccessToken: clientAccessToken };
};
