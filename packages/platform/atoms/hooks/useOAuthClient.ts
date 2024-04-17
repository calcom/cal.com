import type { AxiosError } from "axios";
import { useState, useEffect } from "react";
import { usePrevious } from "react-use";

import type { ApiResponse } from "@calcom/platform-types";

import http from "../lib/http";

export interface useOAuthClientProps {
  clientId: string;
  apiUrl?: string;
  refreshUrl?: string;
  onError: (error: string) => void;
  onSuccess: () => void;
}
export const useOAuthClient = ({ clientId, apiUrl, refreshUrl, onError, onSuccess }: useOAuthClientProps) => {
  const prevClientId = usePrevious(clientId);
  const [isInit, setIsInit] = useState<boolean>(false);

  useEffect(() => {
    if (apiUrl && http.getUrl() !== apiUrl) {
      http.setUrl(apiUrl);
      setIsInit(true);
    }
    if (refreshUrl && http.getRefreshUrl() !== refreshUrl) {
      http.setRefreshUrl(refreshUrl);
    }
  }, [apiUrl, refreshUrl]);

  useEffect(() => {
    if (clientId && http.getUrl() && prevClientId !== clientId) {
      try {
        http
          .get<ApiResponse>(`/provider/${clientId}`)
          .then(() => {
            onSuccess();
            http.setClientIdHeader(clientId);
          })
          .catch((err: AxiosError) => {
            if (err.response?.status === 401) {
              onError("Invalid oAuth Client.");
            }
          });
      } catch (err) {
        console.error(err);
      }
    }
  }, [clientId, onError, prevClientId, onSuccess]);

  return { isInit };
};
