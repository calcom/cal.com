import { useState, useEffect } from "react";

import type { ApiErrorResponse } from "@calcom/platform-types";

import http from "../lib/http";

export type OnCheckErroType = (err: ApiErrorResponse) => void;
export interface useGcalProps {
  isAuth: boolean;
  onCheckError?: OnCheckErroType;
}

export const useGcal = ({ isAuth, onCheckError }: useGcalProps) => {
  const [allowConnect, setAllowConnect] = useState<boolean>(false);
  const [checked, setChecked] = useState<boolean>(false);

  const redirectToGcalOAuth = () => {
    http
      ?.get("/gcal/oauth/auth-url")
      .then(({ data: responseBody }) => {
        if (responseBody.data?.authUrl) {
          window.location.href = responseBody.data.authUrl;
        }
      })
      .catch(console.error);
  };

  useEffect(() => {
    if (isAuth) {
      http
        ?.get("/gcal/check")
        .then(() => setAllowConnect(false))
        .catch((err) => {
          setAllowConnect(true);
          onCheckError?.(err as ApiErrorResponse);
        })
        .finally(() => setChecked(true));
    }
  }, [isAuth]);

  return { allowConnect, checked, redirectToGcalOAuth };
};
