import type { FC } from "react";
import { useEffect } from "react";

import { useAtomsContext } from "../cal-provider/useProvider";

export const GcalConnect: FC = () => {
  const {
    clientId,
    options: { apiUrl },
    error,
    getClient,
  } = useAtomsContext();
  const httpClient = getClient();

  useEffect(() => {
    if (!error) httpClient?.get("/atoms/gcal-connect/check").catch(console.error);
  }, [error]);

  if (!clientId || !apiUrl) return <></>;

  if (error) return <>{error}</>;

  return <></>;
};
