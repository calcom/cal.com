import { SUCCESS_STATUS } from "@calcom/platform-constants";
import type { ApiResponse } from "@calcom/platform-types";
import type { AxiosError } from "axios";
import { useEffect, useState } from "react";
import { usePrevious } from "react-use";
import http from "../lib/http";

interface OAuthClientData {
  clientId: string;
  organizationId: number | null;
}

export interface useOAuthClientProps {
  isEmbed?: boolean;
  clientId: string;
  apiUrl?: string;
  refreshUrl?: string;
  onError: (error: string) => void;
  onSuccess: (data: OAuthClientData) => void;
  isOAuth2?: boolean;
}
export const useOAuthClient = ({
  isEmbed,
  clientId,
  apiUrl,
  refreshUrl,
  onError,
  onSuccess,
  isOAuth2 = false,
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
        const fetchUrl = isOAuth2 ? `/atoms/auth/oauth2/clients/${clientId}` : `/provider/${clientId}`;
        http
          .get<ApiResponse<OAuthClientData>>(fetchUrl)
          .then((response) => {
            if (response.data.status === SUCCESS_STATUS) {
              onSuccess(response.data.data);
            }
            if (!isOAuth2) {
              http.setClientIdHeader(clientId);
            }
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
