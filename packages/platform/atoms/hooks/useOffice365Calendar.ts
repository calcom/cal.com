import { useQuery } from "@tanstack/react-query";
import type { OnCheckErrorType } from "hooks/useGcal";
import { useState, useEffect } from "react";

import type { ApiResponse } from "@calcom/platform-types";
import { type ApiErrorResponse } from "@calcom/platform-types";

import { SUCCESS_STATUS, ERROR_STATUS } from "../../constants/api";
import http from "../lib/http";

export interface useOffice365CalendarProps {
  isAuth: boolean;
  onCheckError?: OnCheckErrorType;
}

export const QUERY_KEY = ["get-office-365-redirect-uri"];

export const useGetRedirectUrl = (calendar: string) => {
  const authUrl = useQuery({
    queryKey: QUERY_KEY,
    staleTime: Infinity,
    enabled: false,
    queryFn: () => {
      return http
        ?.get<ApiResponse<{ authUrl: string }>>(`/calendars/${calendar}/connect`)
        .then(({ data: responseBody }) => {
          if (responseBody.status === SUCCESS_STATUS) {
            return responseBody.data.authUrl;
          }
          if (responseBody.status === ERROR_STATUS) throw new Error(responseBody.error.message);
          return "";
        });
    },
  });

  return authUrl;
};

export const useOffice365Calendar = ({ isAuth, onCheckError }: useOffice365CalendarProps) => {
  const [allowConnect, setAllowConnect] = useState<boolean>(false);
  const [checked, setChecked] = useState<boolean>(false);

  const { refetch } = useGetRedirectUrl("office365");

  const redirectToOffice365OAuth = async () => {
    const redirectUri = await refetch();

    if (redirectUri.data) {
      window.location.href = redirectUri.data;
    }
  };

  useEffect(() => {
    if (isAuth) {
      http
        ?.get("/calendars/office365/check")
        .then(() => setAllowConnect(false))
        .catch((err) => {
          setAllowConnect(true);
          onCheckError?.(err as ApiErrorResponse);
        })
        .finally(() => setChecked(true));
    }
  }, [isAuth]);

  return { allowConnect, checked, redirectToOffice365OAuth };
};
