import type { AxiosError } from "axios";
import { useState, useEffect } from "react";
import { usePrevious } from "react-use";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import type { ApiResponse } from "@calcom/platform-types";

import http from "../lib/http";

export interface useOAuthClientProps {
  isEmbed?: boolean;
  clientId: string;
  apiUrl?: string;
  refreshUrl?: string;
  onError: (error: string) => void;
  onSuccess: (data: { client: string; organizationId: number; name: string }) => void;
}
export const useOAuthClient = ({
  isEmbed,
  clientId,
  apiUrl,
  refreshUrl,
  onError,
  onSuccess,
}: useOAuthClientProps) => {
  const prevClientId = usePrevious(clientId);
  const [isInit, setIsInit] = useState<boolean>(false);
  useEffect(() => {
    if (apiUrl) {
      http.setUrl(apiUrl);
      setIsInit(true);
    }
    if (refreshUrl) {
      http.setRefreshUrl(refreshUrl);
    }
  }, [apiUrl, refreshUrl]);

  useEffect(() => {
    if (!isEmbed && clientId && http.getUrl() && prevClientId !== clientId) {
      try {
        http
          .get<ApiResponse<{ client: string; organizationId: number; name: string }>>(`/provider/${clientId}`)
          .then((response) => {
            if (response.data.status === SUCCESS_STATUS) {
              onSuccess(response.data.data);
            }
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
  }, [isEmbed, clientId, onError, prevClientId, onSuccess, http.getUrl()]);

  return { isInit };
};
