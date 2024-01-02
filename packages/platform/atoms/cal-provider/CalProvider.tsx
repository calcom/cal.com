import type { AxiosError } from "axios";
import type { ReactNode } from "react";
import { useState } from "react";
import { useEffect } from "react";
import { usePrevious } from "react-use";

import type { ApiResponse } from "@calcom/platform-types";

import http from "../../lib/http";
import type { IAtomsContext } from "./useProvider";
import { AtomsContext } from "./useProvider";

type CalProviderProps = Omit<IAtomsContext, "getClient"> & {
  children?: ReactNode;
};

export function CalProvider({ clientId, accessToken, options, children }: CalProviderProps) {
  const prevClientId = usePrevious(clientId);
  const prevAccessToken = usePrevious(accessToken);
  const [isInit, setIsInit] = useState<boolean>(false);
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
    if (accessToken && http.getUrl() && prevAccessToken !== accessToken) {
      http.setAuthorizationHeader(accessToken);
      try {
        http
          .get<ApiResponse>(`/atoms/cal-provider/${clientId}/access-token`)
          .then(() => {
            setClientAccessToken(accessToken);
          })
          .catch((err: AxiosError) => {
            if (err.response?.status === 401) {
              setError("Invalid Access Token.");
            }
          });
      } catch (err) {}
    }
  }, [accessToken, clientId, prevAccessToken]);

  useEffect(() => {
    let isRefreshing = false;
    const interceptorId =
      clientAccessToken && http.getAuthorizationHeader()
        ? http.responseInterceptor.use(undefined, async (err) => {
            if (options.refreshUrl && err.response?.status === 498 && !isRefreshing) {
              isRefreshing = true;
              const response = await fetch(`${options.refreshUrl}`, {
                method: "GET",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: http.getAuthorizationHeader(),
                },
              });
              const res = await response.json();
              if (res.accessToken) {
                http.setAuthorizationHeader(res.accessToken);
                setClientAccessToken(res.accessToken);
              }
            }
            isRefreshing = false;
          })
        : "";

    return () => {
      if (interceptorId) {
        http.responseInterceptor.eject(interceptorId);
      }
    };
  }, [options.refreshUrl, clientAccessToken]);

  return isInit ? (
    <AtomsContext.Provider
      value={{
        clientId,
        accessToken: clientAccessToken,
        options,
        error,
        getClient: () => http,
      }}>
      {children}
    </AtomsContext.Provider>
  ) : (
    <>{children}</>
  );
}
