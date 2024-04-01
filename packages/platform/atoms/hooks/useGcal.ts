import { useState, useEffect } from "react";

import http from "../lib/http";

export interface useGcalProps {
  isAuth: boolean;
}

export const useGcal = ({ isAuth }: useGcalProps) => {
  const [allowConnect, setAllowConnect] = useState<boolean>(false);
  const [checked, setChecked] = useState<boolean>(false);

  const redirectToGcalOAuth = () => {
    http
      ?.get("/ee/gcal/oauth/auth-url")
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
        ?.get("/ee/gcal/check")
        .then(() => setAllowConnect(false))
        .catch(() => setAllowConnect(true))
        .finally(() => setChecked(true));
    }
  }, [isAuth]);

  return { allowConnect, checked, redirectToGcalOAuth };
};
