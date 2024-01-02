import { cn } from "@/lib/utils";
import type { FC } from "react";
import { useState } from "react";
import { useEffect } from "react";

import { Button } from "@calcom/ui";
import { CalendarDays } from "@calcom/ui/components/icon";

import { useAtomsContext } from "../cal-provider/useProvider";

interface GcalConnectProps {
  className?: string;
  label?: string;
}

export const GcalConnect: FC<GcalConnectProps> = ({ label = "Connect Google Calendar", className }) => {
  const {
    clientId,
    options: { apiUrl },
    error,
    getClient,
  } = useAtomsContext();
  const httpClient = getClient();
  const [allowConnect, setAllowConnect] = useState<boolean>(false);
  useEffect(() => {
    if (!error) httpClient?.get("/atoms/gcal-connect/check").catch(() => setAllowConnect(true));
  }, [error, httpClient]);

  if (!clientId || !apiUrl) return <></>;

  if (error) return <>{error}</>;

  return allowConnect ? (
    <Button
      StartIcon={CalendarDays}
      color="primary"
      className={cn("", className)}
      onClick={() =>
        httpClient
          ?.get("/apps/gcal/oauth/auth-url")
          .then(({ data: responseBody }) => {
            console.log(responseBody);
            if (responseBody.data?.authUrl) {
              window.location.href = responseBody.data.authUrl;
            }
          })
          .catch(console.error)
      }>
      {label}
    </Button>
  ) : (
    <></>
  );
};
