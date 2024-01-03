import type { AxiosError, AxiosRequestConfig } from "axios";
import type { ReactNode } from "react";
import { useState } from "react";
import { useEffect } from "react";
import { usePrevious } from "react-use";

import type { ApiResponse } from "@calcom/platform-types";

import http from "../lib/http";
import type { IAtomsContext } from "./useProvider";
import { AtomsContext } from "./useProvider";

type CalProviderProps = Omit<IAtomsContext, "getClient" | "isAuth" | "isValidClient"> & {
  children?: ReactNode;
};

export function CalProvider({ clientId, accessToken, options, children }: CalProviderProps) {
  const prevClientId = usePrevious(clientId);
  const prevAccessToken = usePrevious(accessToken);
  const [isInit, setIsInit] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const [clientAccessToken, setClientAccessToken] = useState<string>("");
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (options.apiUrl && http.getUrl() !== options.apiUrl) {
      http.setUrl(options.apiUrl);
      setIsInit(true);
    }
    if (options.refreshUrl && http.getRefreshUrl() !== options.refreshUrl) {
      http.setRefreshUrl(options.refreshUrl);
    }
  }, [options.apiUrl, options.refreshUrl]);

  useEffect(() => {
    if (clientId && http.getUrl() && prevClientId !== clientId) {
      try {
        http.get<ApiResponse>(`/atoms/cal-provider/${clientId}`).catch((err: AxiosError) => {
          if (err.response?.status === 401) {
            setError("Invalid oAuth Client.");
          }
        });
      } catch (err) {}
    }
  }, [clientId, prevClientId]);

  useEffect(() => {
    let isRefreshing = false;
    const interceptorId =
      clientAccessToken && http.getAuthorizationHeader()
        ? http.responseInterceptor.use(undefined, async (err: AxiosError) => {
            const originalRequest = err.config as AxiosRequestConfig & { _retry?: boolean };
            if (options.refreshUrl && err.response?.status === 498 && !isRefreshing) {
              isRefreshing = true;
              setIsRefreshing(true);
              originalRequest._retry = true;
              const refreshedToken = await http.refreshTokens(options.refreshUrl);

              if (refreshedToken) setClientAccessToken(refreshedToken);
              else setError("Invalid Refresh Token.");

              setIsRefreshing(false);
              isRefreshing = false;

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
  }, [options.refreshUrl, clientAccessToken]);

  useEffect(() => {
    if (accessToken && http.getUrl() && prevAccessToken !== accessToken) {
      http.setAuthorizationHeader(accessToken);
      try {
        http
          .get<ApiResponse>(`/atoms/cal-provider/${clientId}/access-token`)
          .catch(async (err: AxiosError) => {
            if (err.response?.status === 401) setError("Invalid Access Token.");

            if (err.response?.status === 498 && options.refreshUrl) {
              setIsRefreshing(true);
              const refreshedToken = await http.refreshTokens(options.refreshUrl);
              if (refreshedToken) setClientAccessToken(refreshedToken);
              else setError("Invalid Refresh Token.");
              setIsRefreshing(false);
            }
          })
          .finally(() => {
            setClientAccessToken(accessToken);
          });
      } catch (err) {}
    }
  }, [accessToken, clientId, options.refreshUrl, prevAccessToken]);

  return isInit ? (
    <AtomsContext.Provider
      value={{
        clientId,
        accessToken: clientAccessToken,
        options,
        error,
        getClient: () => http,
        isRefreshing: isRefreshing,
        isValidClient: Boolean(!error && clientId && isInit),
        isAuth: Boolean(
          !error && clientId && !isRefreshing && clientAccessToken && http.getAuthorizationHeader()
        ),
      }}>
      {children}
    </AtomsContext.Provider>
  ) : (
    <>{children}</>
  );
}
