import { useState, useEffect } from "react";

import http from "../lib/http";

export interface useGcalProps {
  isAuth: boolean;
}

export const useGcal = ({ isAuth }: useGcalProps) => {
  const [allowConnect, setAllowConnect] = useState<boolean>(false);
  const [checked, setChecked] = useState<boolean>(false);

  useEffect(() => {
    if (isAuth) {
      http
        ?.get("/atoms/gcal-connect/check")
        .then(() => setAllowConnect(false))
        .catch(() => setAllowConnect(true))
        .finally(() => setChecked(true));
    }
  }, [isAuth]);

  return { allowConnect, checked };
};
